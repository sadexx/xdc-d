import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { ICapturePaymentContext } from "src/modules/payments-analysis/common/interfaces/capture";
import { EPaymentCustomerType, EPaymentsErrorCodes, EPaymentStatus } from "src/modules/payments/common/enums/core";
import { formatDecimalString } from "src/common/utils";
import { LokiLogger } from "src/common/logger";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { PaymentsExternalOperationsService, PaymentsManagementService } from "src/modules/payments/services";
import { StripePaymentsService } from "src/modules/stripe/services";
import { TPaymentItemCaptureContextItem } from "src/modules/payments-analysis/common/types/capture";
import { IPaymentOperationResult, IValidatePaymentItem } from "src/modules/payments/common/interfaces/core";
import { IPaymentExternalOperationResult } from "src/modules/payments/common/interfaces/management";

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
    const { payment, prices, appointment, isSecondAttempt } = context;
    try {
      const captureResults: IPaymentExternalOperationResult[] = [];
      let totalCapturedAmount: number = 0;

      for (const [i, paymentItem] of payment.items.entries()) {
        const isMainItem = i === 0;
        const amountToCapture = isMainItem ? prices.clientFullAmount : paymentItem.fullAmount;
        const captureResult = await this.captureItem(
          manager,
          paymentItem,
          amountToCapture,
          customerType,
          isSecondAttempt,
        );
        captureResults.push(captureResult);

        if (this.isCaptureSuccess(captureResult)) {
          totalCapturedAmount += amountToCapture;
        }
      }

      const allCaptured = captureResults.every((result) => this.isCaptureSuccess(result));

      if (allCaptured) {
        await this.handleCapturedPayment(manager, context, totalCapturedAmount);
      }

      return { success: allCaptured };
    } catch (error) {
      this.lokiLogger.error(`Failed to capture payment for appointmentId: ${appointment.id}`, (error as Error).stack);
      throw new InternalServerErrorException(EPaymentsErrorCodes.CAPTURE_PAYMENT_FAILED);
    }
  }

  private async captureItem(
    manager: EntityManager,
    paymentItem: TPaymentItemCaptureContextItem,
    amountToCapture: number,
    customerType: EPaymentCustomerType,
    isSecondAttempt: boolean,
  ): Promise<IPaymentExternalOperationResult> {
    const validationResult = this.validatePaymentItemForCapture(paymentItem, customerType, isSecondAttempt);

    if (!validationResult.valid) {
      const result: IPaymentExternalOperationResult = {
        status: EPaymentStatus.CAPTURE_FAILED,
        error: validationResult.reason,
      };
      await this.handleFailedCapturePaymentItem(manager, paymentItem, result);

      return result;
    }

    let result: IPaymentExternalOperationResult;

    if (customerType === EPaymentCustomerType.INDIVIDUAL) {
      result = await this.paymentsExternalOperationsService.attemptStripeCapture(paymentItem, amountToCapture);
    } else {
      result = { status: EPaymentStatus.CAPTURED };
    }

    if (this.isCaptureSuccess(result)) {
      await this.handleCapturedPaymentItem(manager, paymentItem, result);
    } else {
      await this.handleFailedCapturePaymentItem(manager, paymentItem, result);
    }

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

  private async handleCapturedPaymentItem(
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

  private async handleFailedCapturePaymentItem(
    manager: EntityManager,
    paymentItem: TPaymentItemCaptureContextItem,
    result: IPaymentExternalOperationResult,
  ): Promise<void> {
    await this.paymentsManagementService.updatePaymentItem(
      manager,
      { id: paymentItem.id },
      { status: result.status, note: result.error },
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
    return result.status === EPaymentStatus.CAPTURED;
  }
}
