import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { EntityManager, In } from "typeorm";
import { EPaymentsErrorCodes, EPaymentStatus } from "src/modules/payments/common/enums/core";
import { formatDecimalString } from "src/common/utils";
import { Company } from "src/modules/companies/entities";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { TProcessSameCompanyCommissionContext } from "src/modules/payments/common/types/capture";
import { LokiLogger } from "src/common/logger";
import { PaymentsManagementService } from "src/modules/payments/services";
import { IPaymentOperationResult } from "src/modules/payments/common/interfaces/core";
import { IPaymentCalculationResult } from "src/modules/payments/common/interfaces/pricing";

@Injectable()
export class PaymentsCorporateSameCompanyCommissionService {
  private readonly lokiLogger = new LokiLogger(PaymentsCorporateSameCompanyCommissionService.name);
  constructor(private readonly paymentsManagementService: PaymentsManagementService) {}

  /**
   * Processes same company commission for internal appointments.
   *
   * When client and interpreter belong to same company, this method creates refund item
   * for the refund amount, creates commission item for platform fee, updates original
   * items to success status, updates payment totals, refunds partial amount to company
   * deposit, and updates appointment paid amount.
   *
   * @param manager - Entity manager for transaction
   * @param context - Same company commission context with commission calculation
   * @returns Success result indicating commission processing completed
   * @throws {InternalServerErrorException} If commission processing fails
   */
  public async processSameCompanyCommission(
    manager: EntityManager,
    context: TProcessSameCompanyCommissionContext,
  ): Promise<IPaymentOperationResult> {
    const { appointment } = context;
    try {
      await this.createRefundItem(manager, context);

      await this.createCommissionItem(manager, context);

      await this.updateOriginalItems(manager, context);

      await this.updatePaymentTotals(manager, context);

      await this.updateCompanyDeposit(manager, context);

      await this.updateAppointmentPaidByClient(manager, context);

      return { success: true };
    } catch (error) {
      this.lokiLogger.error(
        `Failed to process same company commission for appointmentId: ${appointment.id}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(EPaymentsErrorCodes.PROCESS_SAME_COMPANY_COMMISSION_FAILED);
    }
  }

  private async createRefundItem(manager: EntityManager, context: TProcessSameCompanyCommissionContext): Promise<void> {
    const { payment, commissionAmounts } = context;
    await this.paymentsManagementService.constructAndCreatePaymentItem(manager, payment.id, {
      currency: payment.currency,
      status: EPaymentStatus.REFUND,
      note: `Same company commission refund. Commission retained: ${commissionAmounts.commissionAmount}.`,
      prices: {
        clientAmount: -commissionAmounts.refundAmount,
        clientGstAmount: 0,
        clientFullAmount: -commissionAmounts.refundAmount,
      } as IPaymentCalculationResult,
    });
  }

  private async createCommissionItem(
    manager: EntityManager,
    context: TProcessSameCompanyCommissionContext,
  ): Promise<void> {
    const { payment, commissionAmounts } = context;
    await this.paymentsManagementService.constructAndCreatePaymentItem(manager, payment.id, {
      currency: payment.currency,
      status: EPaymentStatus.CAPTURED,
      note: `Same company commission captured: ${commissionAmounts.commissionAmount}.`,
      prices: {
        clientAmount: commissionAmounts.commissionWithoutGst,
        clientGstAmount: commissionAmounts.commissionGstAmount,
        clientFullAmount: commissionAmounts.commissionAmount,
      } as IPaymentCalculationResult,
    });
  }

  private async updateOriginalItems(
    manager: EntityManager,
    context: TProcessSameCompanyCommissionContext,
  ): Promise<void> {
    const { payment } = context;
    const authorizedItems = payment.items.filter((item) => item.status === EPaymentStatus.AUTHORIZED);

    if (authorizedItems.length === 0) {
      return;
    }

    const itemIds = authorizedItems.map((item) => item.id);
    await this.paymentsManagementService.updatePaymentItem(
      manager,
      { id: In(itemIds) },
      { status: EPaymentStatus.SUCCESS },
    );
  }

  private async updatePaymentTotals(
    manager: EntityManager,
    context: TProcessSameCompanyCommissionContext,
  ): Promise<void> {
    const { payment, commissionAmounts } = context;
    await this.paymentsManagementService.updatePayment(
      manager,
      { id: payment.id },
      {
        totalAmount: formatDecimalString(commissionAmounts.commissionWithoutGst),
        totalGstAmount: formatDecimalString(commissionAmounts.commissionGstAmount),
        totalFullAmount: formatDecimalString(commissionAmounts.commissionAmount),
        note: `Same company processing - ${commissionAmounts.refundPercent}% refunded, ${commissionAmounts.commissionPercent}% commission retained`,
      },
    );
  }

  private async updateCompanyDeposit(
    manager: EntityManager,
    context: TProcessSameCompanyCommissionContext,
  ): Promise<void> {
    const { payment, commissionAmounts } = context;
    const currentDeposit = payment.company.depositAmount ?? 0;
    const newDeposit = currentDeposit + commissionAmounts.refundAmount;

    await manager.getRepository(Company).update(payment.company.id, { depositAmount: formatDecimalString(newDeposit) });
  }

  private async updateAppointmentPaidByClient(
    manager: EntityManager,
    context: TProcessSameCompanyCommissionContext,
  ): Promise<void> {
    const { appointment, commissionAmounts, payment } = context;
    await manager.getRepository(Appointment).update(appointment.id, {
      paidByClient: formatDecimalString(commissionAmounts.commissionAmount),
      clientCurrency: payment.currency,
    });
  }
}
