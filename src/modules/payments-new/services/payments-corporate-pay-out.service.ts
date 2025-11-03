import { Injectable } from "@nestjs/common";
import { PaymentsExternalOperationsService, PaymentsManagementService } from "src/modules/payments-new/services";
import { DataSource, EntityManager, In, IsNull, Not, Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { Payment } from "src/modules/payments-new/entities";
import { LokiLogger } from "src/common/logger";
import {
  MakeCorporatePayOutsQuery,
  TMakeCorporatePayOuts,
  TMakeCorporatePayOutsCompany,
} from "src/modules/payments-new/common/types";
import {
  EPaymentCurrency,
  EPaymentCustomerType,
  EPaymentStatus,
  EPaymentSystem,
  EStripeInterpreterPayOutType,
} from "src/modules/payments-new/common/enums";
import {
  ICalculatePaymentGroupTotals,
  IPaymentExternalOperationResult,
} from "src/modules/payments-new/common/interfaces";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { UNDEFINED_VALUE } from "src/common/constants";
import { findManyTyped } from "src/common/utils";
import { QueueInitializeService } from "src/modules/queues/services";

@Injectable()
export class PaymentsCorporatePayoutService {
  private readonly lokiLogger = new LokiLogger(PaymentsCorporatePayoutService.name);
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly paymentsManagementService: PaymentsManagementService,
    private readonly paymentsExternalOperationsService: PaymentsExternalOperationsService,
    private readonly queueInitializeService: QueueInitializeService,
    private readonly dataSource: DataSource,
  ) {}

  public async makeCorporatePayOuts(): Promise<void> {
    const payments = await findManyTyped<TMakeCorporatePayOuts[]>(this.paymentRepository, {
      select: MakeCorporatePayOutsQuery.select,
      where: {
        customerType: EPaymentCustomerType.CORPORATE,
        items: { status: EPaymentStatus.WAITING_FOR_PAYOUT },
        company: { id: Not(IsNull()) },
      },
      relations: MakeCorporatePayOutsQuery.relations,
    });

    if (payments.length === 0) {
      return;
    }

    const groupedPayments = this.groupPaymentsByCompany(payments);
    for (const [company, payments] of groupedPayments) {
      await this.dataSource.transaction(async (manager) => {
        await this.processCompanyPayout(manager, company, payments);
      });

      await this.queueInitializeService.addProcessCorporatePayOutReceiptGenerationQueue({
        payments,
        company,
      });
      await this.queueInitializeService.addProcessCorporateTaxInvoiceReceiptGenerationQueue({
        payments,
        company,
      });
    }
  }

  private groupPaymentsByCompany(
    payments: TMakeCorporatePayOuts[],
  ): Map<TMakeCorporatePayOutsCompany, TMakeCorporatePayOuts[]> {
    const groupedPayments = new Map<TMakeCorporatePayOutsCompany, TMakeCorporatePayOuts[]>();
    for (const payment of payments) {
      const company = payment.company;

      if (!company) {
        continue;
      }

      const companyPayments = groupedPayments.get(company) ?? [];
      companyPayments.push(payment);
      groupedPayments.set(company, companyPayments);
    }

    return groupedPayments;
  }

  private async processCompanyPayout(
    manager: EntityManager,
    company: TMakeCorporatePayOutsCompany,
    payments: TMakeCorporatePayOuts[],
  ): Promise<void> {
    const totals = this.calculateGroupTotals(payments);
    try {
      const currency = this.determinePayoutCurrency();
      await this.transferAndPayout(manager, company, totals, currency);
      await this.updatePaymentRelatedAppointments(manager, payments);
    } catch (error) {
      this.lokiLogger.error(`Payout failed for company: ${company.id}`, (error as Error).stack);
      await this.markPaymentsAsFailed(manager, totals, (error as Error).message);
    }
  }

  private calculateGroupTotals(payments: TMakeCorporatePayOuts[]): ICalculatePaymentGroupTotals {
    const totals: ICalculatePaymentGroupTotals = { totalFullAmount: 0, paymentIds: [] };
    for (const payment of payments) {
      const amount = Number(payment.totalFullAmount ?? 0);

      if (amount <= 0) {
        continue;
      }

      totals.totalFullAmount += amount;
      totals.paymentIds.push(payment.id);
    }

    return totals;
  }

  private async transferAndPayout(
    manager: EntityManager,
    company: TMakeCorporatePayOutsCompany,
    totals: ICalculatePaymentGroupTotals,
    currency: EPaymentCurrency,
  ): Promise<void> {
    const { paymentInformation } = company;
    const { paymentIds } = totals;

    const transferResult = await this.createTransfer(company, totals, currency);

    const isPersonalCard = Boolean(
      paymentInformation.stripeInterpreterCardId && paymentInformation.stripeInterpreterCardLast4,
    );
    const paymentMethodInfo = this.determinePaymentMethodInfo(company, isPersonalCard);
    const stripePayoutType =
      paymentInformation.interpreterSystemForPayout === EPaymentSystem.STRIPE
        ? EStripeInterpreterPayOutType.INTERNAL
        : UNDEFINED_VALUE;

    await this.updatePaymentsAndItemsAfterTransfer(
      manager,
      paymentIds,
      transferResult,
      paymentMethodInfo,
      stripePayoutType,
    );

    if (stripePayoutType && isPersonalCard) {
      await this.createStripePayout(manager, company, totals, currency, transferResult);
    }
  }

  private async updatePaymentRelatedAppointments(
    manager: EntityManager,
    payments: TMakeCorporatePayOuts[],
  ): Promise<void> {
    for (const payment of payments) {
      const { appointment } = payment;

      if (appointment) {
        await manager.getRepository(Appointment).update(appointment.id, {
          receivedByInterpreter: payment.totalFullAmount,
          receivedByInterpreterGst: payment.totalGstAmount,
          interpreterCurrency: payment.currency,
        });
      }
    }
  }

  private async updatePaymentsAndItemsAfterTransfer(
    manager: EntityManager,
    paymentIds: string[],
    transferResult: IPaymentExternalOperationResult,
    paymentMethodInfo: string,
    stripePayoutType?: EStripeInterpreterPayOutType,
  ): Promise<void> {
    await this.paymentsManagementService.updatePayment(
      manager,
      { id: In(paymentIds) },
      { stripeInterpreterPayoutType: stripePayoutType, paymentMethodInfo, note: transferResult.error },
    );
    await this.paymentsManagementService.updatePaymentItem(
      manager,
      { payment: { id: In(paymentIds) } },
      { transferId: transferResult.transferId, status: transferResult.status, note: transferResult.error },
    );
  }

  private async createTransfer(
    company: TMakeCorporatePayOutsCompany,
    totals: ICalculatePaymentGroupTotals,
    currency: EPaymentCurrency,
  ): Promise<IPaymentExternalOperationResult> {
    const { paymentInformation } = company;
    const { totalFullAmount, paymentIds } = totals;
    const [paymentId] = paymentIds;

    switch (paymentInformation.interpreterSystemForPayout) {
      case EPaymentSystem.STRIPE:
        return this.paymentsExternalOperationsService.attemptStripeTransfer(
          totalFullAmount,
          currency,
          paymentInformation.stripeInterpreterAccountId,
          paymentId,
        );
      default:
        return this.paymentsExternalOperationsService.attemptPaypalTransfer(
          totalFullAmount,
          currency,
          paymentInformation.paypalPayerId,
          company.platformId,
          paymentId,
          true,
        );
    }
  }

  private async createStripePayout(
    manager: EntityManager,
    company: TMakeCorporatePayOutsCompany,
    totals: ICalculatePaymentGroupTotals,
    currency: EPaymentCurrency,
    transferResult: IPaymentExternalOperationResult,
  ): Promise<void> {
    const { paymentIds, totalFullAmount } = totals;

    if (transferResult.status !== EPaymentStatus.TRANSFERED) {
      return await this.paymentsManagementService.updatePaymentItem(
        manager,
        { payment: { id: In(paymentIds) } },
        { status: EPaymentStatus.TRANSFER_FAILED, note: `Payment transfer failed.` },
      );
    }

    const { paymentInformation } = company;
    const [paymentId] = paymentIds;
    const payoutResult = await this.paymentsExternalOperationsService.attemptStripePayout(
      totalFullAmount,
      currency,
      paymentInformation.stripeInterpreterAccountId,
      paymentId,
    );

    await this.paymentsManagementService.updatePaymentItem(
      manager,
      { payment: { id: In(paymentIds) } },
      { externalId: payoutResult.payoutId, status: payoutResult.status, note: payoutResult.error },
    );
  }

  private async markPaymentsAsFailed(
    manager: EntityManager,
    totals: ICalculatePaymentGroupTotals,
    errorMessage: string,
  ): Promise<void> {
    const { paymentIds } = totals;
    await this.paymentsManagementService.updatePayment(
      manager,
      { id: In(paymentIds) },
      { note: `Payout failed: ${errorMessage}.` },
    );
  }

  private determinePaymentMethodInfo(company: TMakeCorporatePayOutsCompany, isPersonalCard: boolean): string {
    const { paymentInformation } = company;
    switch (paymentInformation.interpreterSystemForPayout) {
      case EPaymentSystem.STRIPE: {
        return isPersonalCard
          ? `Credit Card ${paymentInformation.stripeInterpreterCardLast4}`
          : `Bank Account ${paymentInformation.stripeInterpreterBankAccountLast4}`;
      }
      default:
        return `Paypal Account ${paymentInformation.paypalEmail}`;
    }
  }

  private determinePayoutCurrency(): EPaymentCurrency {
    return EPaymentCurrency.AUD;
  }
}
