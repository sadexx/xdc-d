import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ITransferPaymentContext } from "src/modules/payments-analysis/common/interfaces/transfer";
import {
  EPaymentCustomerType,
  EPaymentDirection,
  EPaymentsErrorCodes,
  EPaymentStatus,
  EPaymentSystem,
  EStripeInterpreterPayOutType,
} from "src/modules/payments/common/enums/core";
import { EntityManager } from "typeorm";
import { PaymentsExternalOperationsService, PaymentsManagementService } from "src/modules/payments/services";
import { PaymentItem } from "src/modules/payments/entities";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { UNDEFINED_VALUE } from "src/common/constants";
import { LokiLogger } from "src/common/logger";
import { TMakeRecordToPayOutWaitListContext } from "src/modules/payments/common/types/transfer";
import { formatDecimalString } from "src/common/utils";
import { IPaymentOperationResult } from "src/modules/payments/common/interfaces/core";
import {
  IPaymentExternalOperationResult,
  ICreatePaymentRecordResult,
} from "src/modules/payments/common/interfaces/management";
import { IPaymentCalculationResult } from "src/modules/payments/common/interfaces/pricing";

@Injectable()
export class PaymentsTransferService {
  private readonly lokiLogger = new LokiLogger(PaymentsTransferService.name);
  constructor(
    private readonly paymentsManagementService: PaymentsManagementService,
    private readonly paymentsExternalOperationsService: PaymentsExternalOperationsService,
  ) {}

  /**
   * Creates a payment record in wait list for corporate interpreter payout.
   *
   * Instead of immediate transfer, creates a payment record with WAITING_FOR_PAYOUT status
   * to be processed later in batch. Used for corporate interpreters who receive scheduled payouts.
   *
   * @param manager - Entity manager for transaction
   * @param context - Transfer context with interpreter, appointment, and pricing data
   * @returns Success result indicating record was created
   * @throws {InternalServerErrorException} If creating payout record fails
   */
  public async makeRecordToPayOutWaitList(
    manager: EntityManager,
    context: TMakeRecordToPayOutWaitListContext,
  ): Promise<IPaymentOperationResult> {
    const { interpreter, appointment, interpreterPrices, currency, company, paymentMethodInfo } = context;
    try {
      await this.paymentsManagementService.createPaymentRecord(manager, {
        direction: EPaymentDirection.OUTCOMING,
        customerType: EPaymentCustomerType.CORPORATE,
        status: EPaymentStatus.WAITING_FOR_PAYOUT,
        toInterpreter: interpreter,
        appointment,
        currency,
        paymentMethodInfo,
        note: "Waiting for Payout",
        company: company ?? UNDEFINED_VALUE,
        prices: interpreterPrices as IPaymentCalculationResult,
        system: company.paymentInformation.interpreterSystemForPayout,
      });

      return { success: true };
    } catch (error) {
      this.lokiLogger.error(
        `Failed to make pay out record to interpreter id: ${interpreter.id}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(EPaymentsErrorCodes.MAKE_PAYOUT_RECORD_FAILED);
    }
  }

  /**
   * Transfers funds to individual interpreter and creates payout payment record.
   *
   * Executes immediate transfer via Stripe or PayPal to the interpreter's account,
   * creates payment record with transfer details, and handles post-transfer updates
   * if successful. Returns payment record result for receipt generation.
   *
   * @param manager - Entity manager for transaction
   * @param context - Transfer context with interpreter payment details and pricing
   * @returns Success result with payment record data if transfer completed
   * @throws {InternalServerErrorException} If transfer or record creation fails
   */
  public async transferAndPayout(
    manager: EntityManager,
    context: ITransferPaymentContext,
  ): Promise<IPaymentOperationResult> {
    const { interpreter } = context;
    try {
      const transferResult = await this.createTransfer(context);
      const paymentRecordResult = await this.createTransferPaymentRecord(manager, context, transferResult);

      if (transferResult.status === EPaymentStatus.TRANSFERED) {
        await this.handleTransferredPayment(manager, paymentRecordResult, context);
      }

      return { success: transferResult.status === EPaymentStatus.TRANSFERED, paymentRecordResult };
    } catch (error) {
      this.lokiLogger.error(
        `Failed to transfer and payout payment to interpreter id: ${interpreter.id}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(EPaymentsErrorCodes.TRANSFER_AND_PAYOUT_FAILED);
    }
  }

  /**
   * Creates a transfer payment record.
   * Used for both success and failure cases.
   *
   * @param manager - Transaction manager for DB ops.
   * @param context - Payment context (prices, appt, etc.).
   * @param externalOperationResult - Stripe result (status, ID, error).
   */
  public async createTransferPaymentRecord(
    manager: EntityManager,
    context: ITransferPaymentContext,
    externalOperationResult: IPaymentExternalOperationResult,
  ): Promise<ICreatePaymentRecordResult> {
    const { interpreter, appointment, interpreterPrices, currency, paymentMethodInfo } = context;

    return await this.paymentsManagementService.createPaymentRecord(manager, {
      direction: EPaymentDirection.OUTCOMING,
      customerType: EPaymentCustomerType.INDIVIDUAL,
      stripeInterpreterPayoutType: EStripeInterpreterPayOutType.INTERNAL,
      toInterpreter: interpreter,
      note: externalOperationResult.error,
      status: externalOperationResult.status,
      transferId: externalOperationResult.transferId,
      currency,
      appointment,
      paymentMethodInfo,
      system: interpreter.paymentInformation.interpreterSystemForPayout,
      prices: interpreterPrices as IPaymentCalculationResult,
    });
  }

  private async handleTransferredPayment(
    manager: EntityManager,
    paymentRecordResult: ICreatePaymentRecordResult,
    context: ITransferPaymentContext,
  ): Promise<void> {
    const { appointment, interpreterPrices, currency, interpreter, isPersonalCard } = context;

    if (interpreter.paymentInformation.interpreterSystemForPayout === EPaymentSystem.STRIPE && isPersonalCard) {
      await this.createStripePayout(manager, context, paymentRecordResult);
    }

    await manager.getRepository(Appointment).update(appointment.id, {
      receivedByInterpreter: formatDecimalString(interpreterPrices.interpreterFullAmount),
      receivedByInterpreterGst: formatDecimalString(interpreterPrices.interpreterGstAmount),
      interpreterCurrency: currency,
    });
  }

  private async createTransfer(context: ITransferPaymentContext): Promise<IPaymentExternalOperationResult> {
    const { interpreter, interpreterPrices, currency, appointment } = context;
    switch (interpreter.paymentInformation.interpreterSystemForPayout) {
      case EPaymentSystem.STRIPE:
        return await this.paymentsExternalOperationsService.attemptStripeTransfer(
          interpreterPrices.interpreterFullAmount,
          currency,
          interpreter.paymentInformation.stripeInterpreterAccountId,
          appointment.id,
        );
      default:
        return await this.paymentsExternalOperationsService.attemptPaypalTransfer(
          interpreterPrices.interpreterFullAmount,
          currency,
          interpreter.paymentInformation.paypalPayerId,
          appointment.platformId,
          appointment.id,
          false,
        );
    }
  }

  private async createStripePayout(
    manager: EntityManager,
    context: ITransferPaymentContext,
    paymentRecordResult: ICreatePaymentRecordResult,
  ): Promise<void> {
    const { interpreterPrices, interpreter, currency } = context;
    const { payment } = paymentRecordResult;
    const externalOperationResult = await this.paymentsExternalOperationsService.attemptStripePayout(
      interpreterPrices.interpreterFullAmount,
      currency,
      interpreter.paymentInformation.stripeInterpreterAccountId,
      payment.id,
    );

    await manager
      .getRepository(PaymentItem)
      .update(
        { payment: { id: payment.id } },
        { status: externalOperationResult.status, externalId: externalOperationResult.payoutId },
      );
  }
}
