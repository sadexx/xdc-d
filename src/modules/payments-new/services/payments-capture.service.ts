import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { ICapturePaymentContext } from "src/modules/payment-analysis/common/interfaces/capture";
import { StripePaymentsService, StripeReceiptsService } from "src/modules/stripe/services";
import { PaymentItem } from "src/modules/payments-new/entities";
import { EPaymentStatus } from "src/modules/payments-new/common/enums";
import { IStripeOperationResult } from "src/modules/stripe/common/interfaces";
import { UNDEFINED_VALUE } from "src/common/constants";
import { TAttemptStripePaymentCapture, TCaptureItemWithAmount } from "src/modules/payments-new/common/types";
import { denormalizedAmountToNormalized, round2 } from "src/common/utils";
import { LokiLogger } from "src/common/logger";
import { QueueInitializeService } from "src/modules/queues/services";
import { Appointment } from "src/modules/appointments/appointment/entities";

@Injectable()
export class PaymentsCaptureService {
  private readonly lokiLogger = new LokiLogger(PaymentsCaptureService.name);
  constructor(
    private readonly stripePaymentsService: StripePaymentsService,
    private readonly stripeReceiptsService: StripeReceiptsService,
    private readonly queueInitializeService: QueueInitializeService,
  ) {}

  public async capturePayment(manager: EntityManager, context: ICapturePaymentContext): Promise<void> {
    try {
      const { payment, prices } = context;
      const [mainPaymentItem, ...secondaryPaymentItems] = payment.items;

      const captureResults: IStripeOperationResult[] = [];

      const mainCaptureResult = await this.captureItemWithAmount(manager, mainPaymentItem, prices.clientFullAmount);
      captureResults.push(mainCaptureResult);

      if (secondaryPaymentItems.length > 0) {
        for (const paymentItem of secondaryPaymentItems) {
          const secondaryCaptureResult = await this.captureItemWithAmount(manager, paymentItem, paymentItem.fullAmount);
          captureResults.push(secondaryCaptureResult);
        }
      }

      const allCaptured = captureResults.every((result) => result.status === EPaymentStatus.CAPTURED);

      if (allCaptured) {
        await this.handleCapturedPayment(manager, context);
      }
    } catch (error) {
      this.lokiLogger.error(
        `Failed to capture payment for appointmentId: ${context.appointment.id}`,
        (error as Error).stack,
      );
      throw new ServiceUnavailableException("Failed to capture payment.");
    }
  }

  private async captureItemWithAmount(
    manager: EntityManager,
    paymentItem: TCaptureItemWithAmount,
    amountToCapture: number,
  ): Promise<IStripeOperationResult> {
    if (!(await this.ensurePaymentItemIsCapturable(manager, paymentItem))) {
      return { status: EPaymentStatus.CAPTURE_FAILED };
    }

    const stripeOperationResult = await this.attemptStripePaymentCapture(
      paymentItem as TAttemptStripePaymentCapture,
      amountToCapture,
    );

    if (stripeOperationResult.status === EPaymentStatus.CAPTURED) {
      await this.handleCapturedPaymentItem(manager, paymentItem, stripeOperationResult);
    }

    return stripeOperationResult;
  }

  private async ensurePaymentItemIsCapturable(
    manager: EntityManager,
    paymentItem: TCaptureItemWithAmount,
  ): Promise<boolean> {
    const paymentItemRepository = manager.getRepository(PaymentItem);

    if (paymentItem.status !== EPaymentStatus.AUTHORIZED) {
      const note = "Incorrect payment status.";
      await paymentItemRepository.update({ id: paymentItem.id }, { status: EPaymentStatus.CAPTURE_FAILED, note });

      return false;
    }

    if (!paymentItem.externalId && paymentItem.fullAmount > 0) {
      const note = "Payment external ID not filled.";
      await paymentItemRepository.update({ id: paymentItem.id }, { status: EPaymentStatus.CAPTURE_FAILED, note });

      return false;
    }

    return true;
  }

  private async handleCapturedPaymentItem(
    manager: EntityManager,
    paymentItem: TCaptureItemWithAmount,
    stripeOperationResult: IStripeOperationResult,
  ): Promise<void> {
    let receipt: string | null = null;
    let note: string | null = null;

    if (stripeOperationResult.latestCharge && stripeOperationResult.latestCharge !== UNDEFINED_VALUE) {
      receipt = await this.stripeReceiptsService.uploadPaymentItemReceipt(paymentItem, stripeOperationResult);
    } else {
      note = "Receipt download failed.";
    }

    await manager
      .getRepository(PaymentItem)
      .update({ id: paymentItem.id }, { status: EPaymentStatus.CAPTURED, receipt, note });
  }

  private async handleCapturedPayment(manager: EntityManager, context: ICapturePaymentContext): Promise<void> {
    const { payment, appointment, prices } = context;

    let totalCapturedAmount = 0;
    for (const paymentItem of payment.items) {
      totalCapturedAmount += paymentItem.fullAmount ?? 0;
    }

    await manager
      .getRepository(Appointment)
      .update(
        { id: context.appointment.id },
        { paidByClient: round2(totalCapturedAmount), clientCurrency: context.payment.currency },
      );

    await this.queueInitializeService.addProcessPayInReceiptGenerationQueue({ payment, appointment, prices });
  }

  private async attemptStripePaymentCapture(
    paymentItem: TAttemptStripePaymentCapture,
    amountToCapture: number,
  ): Promise<IStripeOperationResult> {
    if (amountToCapture <= 0 || !paymentItem.externalId) {
      return {
        status: EPaymentStatus.CAPTURED,
        latestCharge: UNDEFINED_VALUE,
      };
    }

    const idempotencyKey = this.generateCaptureIdempotencyKey(paymentItem);
    const normalizedAmount = denormalizedAmountToNormalized(amountToCapture);

    try {
      const paymentIntent = await this.stripePaymentsService.capturePayment(
        paymentItem.externalId,
        idempotencyKey,
        normalizedAmount,
      );

      return {
        status: EPaymentStatus.CAPTURED,
        paymentIntentId: paymentIntent.id,
        latestCharge: (paymentIntent.latest_charge as string) ?? UNDEFINED_VALUE,
      };
    } catch (error) {
      return {
        status: EPaymentStatus.CAPTURE_FAILED,
        error: (error as Error).message,
      };
    }
  }

  private generateCaptureIdempotencyKey(paymentItem: TAttemptStripePaymentCapture): string {
    return `capture-${paymentItem.id}-${paymentItem.externalId}`;
  }
}
