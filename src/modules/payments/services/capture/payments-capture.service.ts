import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { ICapturePaymentContext } from "src/modules/payments-analysis/common/interfaces/capture";
import {
  EPaymentCustomerType,
  EPaymentsErrorCodes,
  EPaymentStatus,
  EPaymentSystem,
} from "src/modules/payments/common/enums/core";
import { formatDecimalString } from "src/common/utils";
import { LokiLogger } from "src/common/logger";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { PaymentsExternalOperationsService, PaymentsManagementService } from "src/modules/payments/services";
import { StripePaymentsService } from "src/modules/stripe/services";
import {
  TPaymentCaptureContext,
  TPaymentItemCaptureContextItem,
} from "src/modules/payments-analysis/common/types/capture";
import { IPaymentOperationResult, IValidatePaymentItem } from "src/modules/payments/common/interfaces/core";
import { IPaymentExternalOperationResult } from "src/modules/payments/common/interfaces/management";
import { ICaptureAllItems } from "src/modules/payments/common/interfaces/capture";

@Injectable()
export class PaymentsCaptureService {
  private readonly lokiLogger = new LokiLogger(PaymentsCaptureService.name);
  constructor(
    private readonly paymentsManagementService: PaymentsManagementService,
    private readonly paymentsExternalOperationsService: PaymentsExternalOperationsService,
    private readonly stripePaymentsService: StripePaymentsService,
  ) {}

  /**
   * Captures authorized payment for individual or corporate clients.
   *
   * Captures funds for each payment item (main appointment plus any additional blocks).
   * Updates main item amount with recalculated final price. Returns success only if
   * all items are captured successfully.
   *
   * @param manager - Entity manager for transaction
   * @param context - Capture context with payment, pricing, and appointment data
   * @param customerType - Type of customer (individual or corporate)
   * @returns Success result indicating if all items were captured
   * @throws {InternalServerErrorException} If capture process fails
   */
  public async capturePayment(
    manager: EntityManager,
    context: ICapturePaymentContext,
    customerType: EPaymentCustomerType,
  ): Promise<IPaymentOperationResult> {
    const { appointment } = context;
    try {
      const { results, totalCapturedAmount } = await this.captureAllItems(manager, context, customerType);
      const allCaptured = results.every((result) => this.isCaptureSuccess(result));

      if (allCaptured) {
        await this.handleCapturedPayment(manager, context, totalCapturedAmount);
      }

      return { success: allCaptured };
    } catch (error) {
      this.lokiLogger.error(`Failed to capture payment for appointmentId: ${appointment.id}`, (error as Error).stack);
      throw new InternalServerErrorException(EPaymentsErrorCodes.CAPTURE_PAYMENT_FAILED);
    }
  }

  private async captureAllItems(
    manager: EntityManager,
    context: ICapturePaymentContext,
    customerType: EPaymentCustomerType,
  ): Promise<ICaptureAllItems> {
    const { payment, prices } = context;
    let totalCapturedAmount: number = 0;

    const results: IPaymentExternalOperationResult[] = [];
    for (const [i, paymentItem] of payment.items.entries()) {
      const isMainItem = i === 0;
      const amountToCapture = isMainItem ? prices.clientFullAmount : paymentItem.fullAmount;
      const captureResult = await this.captureSingleItem(manager, context, paymentItem, amountToCapture, customerType);
      results.push(captureResult);

      if (this.isCaptureSuccess(captureResult)) {
        totalCapturedAmount += amountToCapture;
      }
    }

    return { results, totalCapturedAmount };
  }

  private async captureSingleItem(
    manager: EntityManager,
    context: ICapturePaymentContext,
    paymentItem: TPaymentItemCaptureContextItem,
    amountToCapture: number,
    customerType: EPaymentCustomerType,
  ): Promise<IPaymentExternalOperationResult> {
    const { isSecondAttempt, payment } = context;
    const validation = this.validatePaymentItemForCapture(paymentItem, customerType, isSecondAttempt);

    if (!validation.valid) {
      const result: IPaymentExternalOperationResult = {
        status: EPaymentStatus.CAPTURE_FAILED,
        error: validation.reason,
      };
      await this.updatePaymentItem(manager, paymentItem, result);

      return result;
    }

    let result: IPaymentExternalOperationResult;

    if (customerType === EPaymentCustomerType.INDIVIDUAL) {
      result = await this.paymentsExternalOperationsService.attemptStripeCapture(paymentItem, amountToCapture);
    } else {
      result = await this.handleCorporatePaymentCapture(payment);
    }

    await this.updatePaymentItem(manager, paymentItem, result);

    return result;
  }

  private validatePaymentItemForCapture(
    paymentItem: TPaymentItemCaptureContextItem,
    customerType: EPaymentCustomerType,
    isSecondAttempt: boolean,
  ): IValidatePaymentItem {
    const isValidStatus = isSecondAttempt
      ? paymentItem.status === EPaymentStatus.AUTHORIZED || paymentItem.status === EPaymentStatus.CAPTURE_FAILED
      : paymentItem.status === EPaymentStatus.AUTHORIZED;

    if (!isValidStatus) {
      return {
        valid: false,
        reason: `Incorrect payment status: ${paymentItem.status}. ${isSecondAttempt ? "Second attempt requires authorized or capture-failed." : "First attempt requires authorized."}`,
      };
    }

    if (customerType === EPaymentCustomerType.INDIVIDUAL && !paymentItem.externalId && paymentItem.fullAmount > 0) {
      return { valid: false, reason: "Payment external ID not filled." };
    }

    return { valid: true };
  }

  private async handleCorporatePaymentCapture(
    payment: TPaymentCaptureContext,
  ): Promise<IPaymentExternalOperationResult> {
    if (payment.system === EPaymentSystem.DEPOSIT) {
      return { status: EPaymentStatus.CAPTURED };
    } else {
      return { status: EPaymentStatus.PENDING_PAYMENT };
    }
  }

  private async updatePaymentItem(
    manager: EntityManager,
    paymentItem: TPaymentItemCaptureContextItem,
    result: IPaymentExternalOperationResult,
  ): Promise<void> {
    let receipt: string | null = null;
    let note: string | null = null;

    if (result.latestCharge) {
      receipt = await this.stripePaymentsService.getPaymentReceipt(paymentItem.id, result.latestCharge);
      note = !receipt ? "Receipt download failed." : null;
    }

    await this.paymentsManagementService.updatePaymentItem(
      manager,
      { id: paymentItem.id },
      { status: result.status, receipt, note },
    );
  }

  private async handleCapturedPayment(
    manager: EntityManager,
    context: ICapturePaymentContext,
    totalCapturedAmount: number,
  ): Promise<void> {
    await manager
      .getRepository(Appointment)
      .update(
        { id: context.appointment.id },
        { paidByClient: formatDecimalString(totalCapturedAmount), clientCurrency: context.payment.currency },
      );
  }

  private isCaptureSuccess(result: IPaymentExternalOperationResult): boolean {
    return result.status === EPaymentStatus.CAPTURED || result.status === EPaymentStatus.PENDING_PAYMENT;
  }
}
