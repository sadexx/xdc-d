import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { IAuthorizationPaymentContext } from "src/modules/payments-analysis/common/interfaces/authorization";
import { Company } from "src/modules/companies/entities";
import { EntityManager } from "typeorm";
import { formatDecimalString } from "src/common/utils";
import { PaymentsManagementService, PaymentsNotificationService } from "src/modules/payments/services";
import {
  EPaymentCustomerType,
  EPaymentDirection,
  EPaymentFailedReason,
  EPaymentsErrorCodes,
  EPaymentStatus,
  EPaymentSystem,
} from "src/modules/payments/common/enums/core";
import { CompaniesDepositChargeManagementService } from "src/modules/companies-deposit-charge/services";
import { LokiLogger } from "src/common/logger";
import { UNDEFINED_VALUE } from "src/common/constants";
import { AppointmentFailedPaymentCancelService } from "src/modules/appointments/failed-payment-cancel/services";
import { IPaymentOperationResult } from "src/modules/payments/common/interfaces/core";
import {
  TChargeFromCompanyDeposit,
  TCreateDepositChargePaymentRecord,
} from "src/modules/payments/common/types/authorization";

@Injectable()
export class PaymentsCorporateDepositService {
  private readonly lokiLogger = new LokiLogger(PaymentsCorporateDepositService.name);
  constructor(
    private readonly paymentsManagementService: PaymentsManagementService,
    private readonly paymentsNotificationService: PaymentsNotificationService,
    private readonly companiesDepositChargeManagementService: CompaniesDepositChargeManagementService,
    private readonly appointmentFailedPaymentCancelService: AppointmentFailedPaymentCancelService,
  ) {}

  /**
   * Charges payment from corporate client's deposit balance.
   *
   * Deducts appointment cost from company deposit, handles insufficient funds,
   * creates automatic recharge if balance falls below threshold, and sends notifications
   * for low balance warnings. Creates payment record with appropriate status.
   *
   * @param manager - Entity manager for transaction
   * @param context - Authorization context with company and deposit information
   * @returns Success result if charge completed successfully
   * @throws {InternalServerErrorException} If deposit charge fails
   */
  public async chargeFromDeposit(
    manager: EntityManager,
    context: IAuthorizationPaymentContext,
  ): Promise<IPaymentOperationResult> {
    const { appointment } = context;
    try {
      const paymentStatus = await this.chargeFromCompanyDeposit(manager, context as TChargeFromCompanyDeposit);
      await this.createDepositChargePaymentRecord(manager, context as TCreateDepositChargePaymentRecord, paymentStatus);

      return { success: paymentStatus === EPaymentStatus.AUTHORIZED };
    } catch (error) {
      await this.paymentsNotificationService.sendAuthorizationPaymentFailedNotification(
        context.appointment,
        EPaymentFailedReason.AUTH_FAILED,
      );
      this.lokiLogger.error(
        `Failed to charge from deposit for appointmentId: ${appointment.id}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(EPaymentsErrorCodes.CHARGE_FROM_DEPOSIT_FAILED);
    }
  }

  /**
   * Creates a payment record for corporate deposit charge attempt.
   * Used for both success and failure cases, with status-specific notes.
   *
   * @param manager - Transaction manager for DB ops.
   * @param context - Deposit context (prices, appt, company, etc.).
   * @param paymentStatus - Status of the charge (e.g., AUTHORIZED or AUTHORIZATION_FAILED).
   */
  public async createDepositChargePaymentRecord(
    manager: EntityManager,
    context: TCreateDepositChargePaymentRecord,
    paymentStatus: EPaymentStatus,
  ): Promise<void> {
    const { currency, prices, appointment, companyContext, existingPayment } = context;
    const determinedPaymentMethodInfo = `Deposit of company ${companyContext.company.platformId}`;
    const determinedNote =
      paymentStatus === EPaymentStatus.AUTHORIZATION_FAILED ? "Insufficient funds on deposit." : UNDEFINED_VALUE;

    await this.paymentsManagementService.createPaymentRecord(manager, {
      direction: EPaymentDirection.INCOMING,
      customerType: EPaymentCustomerType.CORPORATE,
      system: EPaymentSystem.DEPOSIT,
      status: paymentStatus,
      fromClient: appointment.client,
      company: companyContext.company,
      paymentMethodInfo: determinedPaymentMethodInfo,
      existingPayment: existingPayment ?? UNDEFINED_VALUE,
      note: determinedNote,
      currency,
      prices,
      appointment,
    });
  }

  private async chargeFromCompanyDeposit(
    manager: EntityManager,
    context: TChargeFromCompanyDeposit,
  ): Promise<EPaymentStatus> {
    const { companyContext, depositChargeContext, appointment } = context;

    if (depositChargeContext.isInsufficientFunds) {
      return await this.handleBalanceInsufficientFunds(manager, context);
    }

    await manager.getRepository(Company).update(companyContext.company.id, {
      depositAmount: formatDecimalString(depositChargeContext.balanceAfterCharge),
    });

    if (depositChargeContext.isBalanceBelowTenPercent) {
      await this.handleBalanceBelowTenPercent(manager, context);
    } else if (depositChargeContext.isBalanceBelowFifteenPercent) {
      await this.handleBalanceBelowFifteenPercent(context);
    }

    await this.paymentsNotificationService.sendAuthorizationPaymentSuccessNotification(appointment);

    return EPaymentStatus.AUTHORIZED;
  }

  private async handleBalanceInsufficientFunds(
    manager: EntityManager,
    context: TChargeFromCompanyDeposit,
  ): Promise<EPaymentStatus> {
    const { companyContext } = context;
    await this.appointmentFailedPaymentCancelService.cancelAppointmentPaymentFailed(manager, context.appointment.id);

    if (companyContext.superAdminRole) {
      await this.paymentsNotificationService.sendDepositBalanceInsufficientFundNotification(
        companyContext.company,
        companyContext.superAdminRole,
      );
    }

    await this.paymentsNotificationService.sendAuthorizationPaymentFailedNotification(
      context.appointment,
      EPaymentFailedReason.AUTH_FAILED,
    );

    return EPaymentStatus.AUTHORIZATION_FAILED;
  }

  private async handleBalanceBelowTenPercent(
    manager: EntityManager,
    context: TChargeFromCompanyDeposit,
  ): Promise<void> {
    const { companyContext, depositChargeContext } = context;
    await this.companiesDepositChargeManagementService.createOrUpdateDepositCharge(
      manager,
      companyContext.company,
      depositChargeContext.depositDefaultChargeAmount,
    );
  }

  private async handleBalanceBelowFifteenPercent(context: TChargeFromCompanyDeposit): Promise<void> {
    const { companyContext, depositChargeContext } = context;

    if (companyContext.superAdminRole) {
      await this.paymentsNotificationService.sendDepositLowBalanceNotification(
        companyContext.company,
        companyContext.superAdminRole,
        depositChargeContext.balanceAfterCharge,
      );
    }
  }
}
