import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { IAuthorizationPaymentContext } from "src/modules/payment-analysis/common/interfaces/authorization";
import { Company } from "src/modules/companies/entities";
import { EntityManager } from "typeorm";
import { TChargeFromCompanyDeposit, TCreateDepositChargePaymentRecord } from "src/modules/payments-new/common/types";
import { round2 } from "src/common/utils";
import { PaymentsCreationService, PaymentsNotificationService } from "src/modules/payments-new/services";
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

@Injectable()
export class PaymentsCorporateDepositService {
  private readonly lokiLogger = new LokiLogger(PaymentsCorporateDepositService.name);
  constructor(
    private readonly paymentsCreationService: PaymentsCreationService,
    private readonly paymentsNotificationService: PaymentsNotificationService,
    private readonly companiesDepositChargeManagementService: CompaniesDepositChargeManagementService,
  ) {}

  public async chargeFromDeposit(
    manager: EntityManager,
    context: IAuthorizationPaymentContext,
  ): Promise<IPaymentOperationResult> {
    try {
      await this.chargeFromCompanyDeposit(manager, context as TChargeFromCompanyDeposit);
      await this.createDepositChargePaymentRecord(manager, context as TCreateDepositChargePaymentRecord);

      await this.paymentsNotificationService.sendAuthorizationPaymentSuccessNotification(context.appointment);

      return { success: true };
    } catch (error) {
      await this.paymentsNotificationService.sendAuthorizationPaymentFailedNotification(
        context.appointment,
        EPaymentFailedReason.AUTH_FAILED,
      );
      this.lokiLogger.error(
        `Failed to authorize payment for appointmentId: ${context.appointment.id}`,
        (error as Error).stack,
      );
      throw new ServiceUnavailableException("Failed to authorize payment.");
    }
  }

  private async chargeFromCompanyDeposit(manager: EntityManager, context: TChargeFromCompanyDeposit): Promise<void> {
    const { companyContext, depositChargeContext } = context;

    await manager.getRepository(Company).update(companyContext.company.id, {
      depositAmount: round2(depositChargeContext.balanceAfterCharge),
    });

    if (!depositChargeContext.depositDefaultChargeAmount || depositChargeContext.depositDefaultChargeAmount <= 0) {
      return;
    }

    if (depositChargeContext.isBalanceBelowTenPercent) {
      await this.handleBalanceBelowTenPercent(manager, context);
    } else if (depositChargeContext.isBalanceBelowFifteenPercent) {
      await this.handleBalanceBelowFifteenPercent(context);
    }
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
  ): Promise<void> {
    const { currency, prices, appointment, companyContext, existingPayment } = context;
    const determinedPaymentMethodInfo = `Deposit of company ${companyContext.company.platformId}`;

    await this.paymentsCreationService.createPaymentRecord(manager, {
      direction: EPaymentDirection.INCOMING,
      customerType: EPaymentCustomerType.CORPORATE,
      system: EPaymentSystem.DEPOSIT,
      status: EPaymentStatus.AUTHORIZED,
      fromClient: appointment.client,
      company: companyContext.company,
      paymentMethodInfo: determinedPaymentMethodInfo,
      existingPayment: existingPayment ?? UNDEFINED_VALUE,
      currency,
      prices,
      appointment,
    });
  }
}
