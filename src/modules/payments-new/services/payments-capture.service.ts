import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { ICapturePaymentContext } from "src/modules/payment-analysis/common/interfaces/capture";
import { EPaymentCustomerType, EPaymentStatus } from "src/modules/payments-new/common/enums";
import {
  IPaymentExternalOperationResult,
  IPaymentOperationResult,
  IValidatePaymentItem,
} from "src/modules/payments-new/common/interfaces";
import { TCaptureItemWithAmount } from "src/modules/payments-new/common/types";
import { UNDEFINED_VALUE } from "src/common/constants";
import { round2 } from "src/common/utils";
import { LokiLogger } from "src/common/logger";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { PaymentsExternalOperationsService, PaymentsManagementService } from "src/modules/payments-new/services";
import { StripePaymentsService } from "src/modules/stripe/services";

@Injectable()
export class PaymentsCaptureService {
  private readonly lokiLogger = new LokiLogger(PaymentsCaptureService.name);
  constructor(
    private readonly paymentsManagementService: PaymentsManagementService,
    private readonly paymentsExternalOperationsService: PaymentsExternalOperationsService,
    private readonly stripePaymentsService: StripePaymentsService,
  ) {}

  public async capturePayment(
    manager: EntityManager,
    context: ICapturePaymentContext,
    customerType: EPaymentCustomerType,
  ): Promise<IPaymentOperationResult> {
    const { payment, prices, appointment } = context;
    try {
      const captureResults: IPaymentExternalOperationResult[] = [];
      let totalCapturedAmount: number = 0;

      for (const [i, paymentItem] of payment.items.entries()) {
        const isMainItem = i === 0;
        const amountToCapture = isMainItem ? prices.clientFullAmount : paymentItem.fullAmount;
        const captureResult = await this.captureItem(manager, paymentItem, amountToCapture, customerType);
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
      const typePrefix = customerType === EPaymentCustomerType.CORPORATE ? "corporate " : "";
      this.lokiLogger.error(
        `Failed to ${typePrefix}capture payment for appointmentId: ${appointment.id}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(`Failed to ${typePrefix}capture payment.`);
    }
  }

  private async captureItem(
    manager: EntityManager,
    paymentItem: TCaptureItemWithAmount,
    amountToCapture: number,
    customerType: EPaymentCustomerType,
  ): Promise<IPaymentExternalOperationResult> {
    const validationResult = this.validatePaymentItemForCapture(paymentItem, customerType);

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
    paymentItem: TCaptureItemWithAmount,
    customerType: EPaymentCustomerType,
  ): IValidatePaymentItem {
    if (paymentItem.status !== EPaymentStatus.AUTHORIZED) {
      return { valid: false, reason: "Incorrect payment status." };
    }

    if (customerType === EPaymentCustomerType.INDIVIDUAL && !paymentItem.externalId && paymentItem.fullAmount > 0) {
      return { valid: false, reason: "Payment external ID not filled." };
    }

    return { valid: true };
  }

  private async handleCapturedPaymentItem(
    manager: EntityManager,
    paymentItem: TCaptureItemWithAmount,
    result: IPaymentExternalOperationResult,
  ): Promise<void> {
    const receipt = await this.stripePaymentsService.getPaymentReceipt(paymentItem.id, result.latestCharge);
    const note = !receipt ? "Receipt download failed." : UNDEFINED_VALUE;

    await this.paymentsManagementService.updatePaymentItem(
      manager,
      { id: paymentItem.id },
      { status: result.status, note },
    );
  }

  private async handleFailedCapturePaymentItem(
    manager: EntityManager,
    paymentItem: TCaptureItemWithAmount,
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
        { paidByClient: round2(totalCapturedAmount), clientCurrency: context.payment.currency },
      );
  }

  private isCaptureSuccess(result: IPaymentExternalOperationResult): boolean {
    return result.status === EPaymentStatus.CAPTURED;
  }
}
