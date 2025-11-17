import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { PaymentsManagementService, PaymentsNotificationService } from "src/modules/payments/services";
import {
  EPaymentCustomerType,
  EPaymentDirection,
  EPaymentFailedReason,
  EPaymentsErrorCodes,
  EPaymentStatus,
  EPaymentSystem,
} from "src/modules/payments/common/enums/core";
import { AppointmentFailedPaymentCancelService } from "src/modules/appointments/failed-payment-cancel/services";
import { IAuthorizationPaymentContext } from "src/modules/payments-analysis/common/interfaces/authorization";
import { EntityManager, In } from "typeorm";
import { TPaymentContext } from "src/modules/payments-analysis/common/types/core";
import { UNDEFINED_VALUE } from "src/common/constants";
import { EPaymentOperation } from "src/modules/payments-analysis/common/enums/core";
import { ICapturePaymentContext } from "src/modules/payments-analysis/common/interfaces/capture";
import { ITransferPaymentContext } from "src/modules/payments-analysis/common/interfaces/transfer";
import { IAuthorizationCancelPaymentContext } from "src/modules/payments-analysis/common/interfaces/authorization-cancel";
import { LokiLogger } from "src/common/logger";
import { IPaymentOperationResult } from "src/modules/payments/common/interfaces/core";
import { ICreatePaymentRecord } from "src/modules/payments/common/interfaces/management";
import { IPaymentValidationResult } from "src/modules/payments/common/interfaces/payment-failed";
import { IPaymentCalculationResult } from "src/modules/payments/common/interfaces/pricing";

@Injectable()
export class PaymentsValidationFailedService {
  private readonly lokiLogger = new LokiLogger(PaymentsValidationFailedService.name);
  constructor(
    private readonly paymentsManagementService: PaymentsManagementService,
    private readonly paymentsNotificationService: PaymentsNotificationService,
    private readonly appointmentFailedPaymentCancelService: AppointmentFailedPaymentCancelService,
  ) {}

  /**
   * Handles a payment validation failure by dispatching to operation-specific logic,
   * canceling the appointment, and sending notifications.
   * Returns a failure result for upstream orchestration.
   *
   * @param manager - Transactional EntityManager.
   * @param context - Operation context (e.g., appointment, payment).
   * @param validationResult - Validation errors to log.
   * @throws InternalServerErrorException if handler or post-steps fail.
   */
  public async handlePaymentValidationFailure(
    manager: EntityManager,
    context: TPaymentContext,
    validationResult: IPaymentValidationResult,
  ): Promise<IPaymentOperationResult> {
    const { appointment } = context;
    try {
      await this.dispatchFailureHandler(manager, context, validationResult);

      await this.appointmentFailedPaymentCancelService.cancelAppointmentPaymentFailed(manager, appointment.id);

      await this.sendFailureNotification(context);

      return { success: false };
    } catch (error) {
      this.lokiLogger.error(
        `Failed to process payment validation failure for appointmentId: ${appointment.id}, operation: ${context.operation}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(EPaymentsErrorCodes.VALIDATION_FAILURE_PROCESSING_FAILED);
    }
  }

  private async dispatchFailureHandler(
    manager: EntityManager,
    context: TPaymentContext,
    validationResult: IPaymentValidationResult,
  ): Promise<void> {
    const errorNote = this.formatValidationErrors(validationResult.errors);
    switch (context.operation) {
      case EPaymentOperation.AUTHORIZE_PAYMENT:
        await this.handleAuthorizationFailure(manager, context, errorNote);
        break;
      case EPaymentOperation.AUTHORIZATION_CANCEL_PAYMENT:
        await this.handleAuthorizationCancelFailure(manager, context, errorNote);
        break;
      case EPaymentOperation.CAPTURE_PAYMENT:
        await this.handlePaymentCaptureFailure(manager, context, errorNote);
        break;
      case EPaymentOperation.TRANSFER_PAYMENT:
        await this.handlePaymentTransferFailure(manager, context, errorNote);
        break;
    }
  }

  private async handleAuthorizationFailure(
    manager: EntityManager,
    context: IAuthorizationPaymentContext,
    errorNote: string,
  ): Promise<void> {
    const { isClientCorporate, currency, prices, existingPayment, appointment, companyContext, paymentMethodInfo } =
      context;
    const determinedCustomerType = isClientCorporate ? EPaymentCustomerType.CORPORATE : EPaymentCustomerType.INDIVIDUAL;
    const determinedSystem = isClientCorporate ? EPaymentSystem.DEPOSIT : EPaymentSystem.STRIPE;

    await this.paymentsManagementService.createPaymentRecord(manager, {
      currency,
      direction: EPaymentDirection.INCOMING,
      status: EPaymentStatus.AUTHORIZATION_FAILED,
      system: determinedSystem,
      appointment,
      paymentMethodInfo: paymentMethodInfo,
      customerType: determinedCustomerType,
      fromClient: appointment.client,
      company: companyContext?.company,
      prices: prices ?? UNDEFINED_VALUE,
      existingPayment: existingPayment ?? UNDEFINED_VALUE,
      note: errorNote,
    });
  }

  private async handleAuthorizationCancelFailure(
    manager: EntityManager,
    context: IAuthorizationCancelPaymentContext,
    errorNote: string,
  ): Promise<void> {
    const { payment } = context;
    await this.paymentsManagementService.updatePayment(manager, { id: payment.id }, { note: errorNote });
    const itemIds = payment.items?.map((item) => item.id) ?? [];
    await this.paymentsManagementService.updatePaymentItem(
      manager,
      { id: In(itemIds) },
      { status: EPaymentStatus.CANCEL_FAILED, note: errorNote },
    );
  }

  private async handlePaymentCaptureFailure(
    manager: EntityManager,
    context: ICapturePaymentContext,
    errorNote: string,
  ): Promise<void> {
    const { payment } = context;
    const itemIds = payment.items?.map((item) => item.id) ?? [];

    await this.paymentsManagementService.updatePaymentItem(
      manager,
      { id: In(itemIds) },
      { status: EPaymentStatus.CAPTURE_FAILED, note: errorNote },
    );
  }

  private async handlePaymentTransferFailure(
    manager: EntityManager,
    context: ITransferPaymentContext,
    errorNote: string,
  ): Promise<void> {
    const {
      appointment,
      interpreter,
      interpreterPrices,
      paymentMethodInfo,
      currency,
      isInterpreterCorporate,
      company,
    } = context;
    const determinedCustomerType = isInterpreterCorporate
      ? EPaymentCustomerType.CORPORATE
      : EPaymentCustomerType.INDIVIDUAL;
    const determinedSystem = isInterpreterCorporate ? EPaymentSystem.DEPOSIT : EPaymentSystem.STRIPE;

    const paymentDto: ICreatePaymentRecord = {
      currency,
      direction: EPaymentDirection.OUTCOMING,
      status: EPaymentStatus.TRANSFER_FAILED,
      system: determinedSystem,
      appointment,
      customerType: determinedCustomerType,
      toInterpreter: interpreter,
      paymentMethodInfo: paymentMethodInfo,
      company: company ?? UNDEFINED_VALUE,
      prices: {
        interpreterAmount: interpreterPrices.interpreterAmount,
        interpreterGstAmount: interpreterPrices.interpreterGstAmount,
        interpreterFullAmount: interpreterPrices.interpreterFullAmount,
      } as IPaymentCalculationResult,
      note: errorNote,
    };

    await this.paymentsManagementService.createPaymentRecord(manager, paymentDto);
  }

  private async sendFailureNotification(context: TPaymentContext): Promise<void> {
    const { operation, appointment } = context;
    switch (operation) {
      case EPaymentOperation.AUTHORIZE_PAYMENT:
        await this.paymentsNotificationService.sendAuthorizationPaymentFailedNotification(
          appointment,
          EPaymentFailedReason.PAYMENT_OPERATION_VALIDATION_FAILED,
        );
        break;
      default:
        break;
    }
  }

  private formatValidationErrors(errors: string[]): string {
    return `Validation failed (${errors.length} errors): ${errors.join("; ")}`;
  }
}
