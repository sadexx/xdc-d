import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { IAuthorizationPaymentContext } from "src/modules/payment-analysis/common/interfaces/authorization";
import { Company } from "src/modules/companies/entities";
import { EntityManager } from "typeorm";
import { TChargeFromCompanyDeposit, TCreateDepositChargePaymentRecord } from "src/modules/payments-new/common/types";
import { round2 } from "src/common/utils";
import { PaymentsManagementService, PaymentsNotificationService } from "src/modules/payments-new/services";
import {
  EPaymentCustomerType,
  EPaymentDirection,
  EPaymentFailedReason,
  EPaymentStatus,
  EPaymentSystem,
} from "src/modules/payments-new/common/enums";
import { CompaniesDepositChargeManagementService } from "src/modules/companies-deposit-charge/services";
import { IPaymentOperationResult } from "src/modules/payments-new/common/interfaces";
import { LokiLogger } from "src/common/logger";
import { UNDEFINED_VALUE } from "src/common/constants";
import { AppointmentFailedPaymentCancelTempService } from "src/modules/appointments/failed-payment-cancel/services";

@Injectable()
export class PaymentsCorporateDepositService {
  private readonly lokiLogger = new LokiLogger(PaymentsCorporateDepositService.name);
  constructor(
    private readonly paymentsManagementService: PaymentsManagementService,
    private readonly paymentsNotificationService: PaymentsNotificationService,
    private readonly companiesDepositChargeManagementService: CompaniesDepositChargeManagementService,
    private readonly appointmentFailedPaymentCancelService: AppointmentFailedPaymentCancelTempService,
  ) {}

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
      this.lokiLogger.error(`Failed to authorize payment for appointmentId: ${appointment.id}`, (error as Error).stack);
      throw new InternalServerErrorException("Failed to authorize payment.");
    }
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
      depositAmount: round2(depositChargeContext.balanceAfterCharge),
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

  private async createDepositChargePaymentRecord(
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
}
