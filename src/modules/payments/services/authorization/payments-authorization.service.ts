import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { IAuthorizationPaymentContext } from "src/modules/payments-analysis/common/interfaces/authorization";
import {
  EPaymentCustomerType,
  EPaymentDirection,
  EPaymentFailedReason,
  EPaymentsErrorCodes,
  EPaymentStatus,
  EPaymentSystem,
} from "src/modules/payments/common/enums/core";
import {
  PaymentsExternalOperationsService,
  PaymentsManagementService,
  PaymentsNotificationService,
  PaymentsWaitListService,
} from "src/modules/payments/services";
import { AppointmentFailedPaymentCancelService } from "src/modules/appointments/failed-payment-cancel/services";
import { LokiLogger } from "src/common/logger";
import { EntityManager } from "typeorm";
import { UNDEFINED_VALUE } from "src/common/constants";
import { QueueInitializeService } from "src/modules/queues/services";
import { EPaymentOperation } from "src/modules/payments-analysis/common/enums/core";
import { IRedirectToPaymentWaitListOptions } from "src/modules/payments/common/interfaces/authorization";
import { IPaymentOperationResult } from "src/modules/payments/common/interfaces/core";
import { IPaymentExternalOperationResult } from "src/modules/payments/common/interfaces/management";
import { TAuthorizePaymentContext } from "src/modules/payments/common/types/authorization";

@Injectable()
export class PaymentsAuthorizationService {
  private readonly lokiLogger = new LokiLogger(PaymentsAuthorizationService.name);
  constructor(
    private readonly paymentsManagementService: PaymentsManagementService,
    private readonly paymentsWaitListService: PaymentsWaitListService,
    private readonly paymentsNotificationService: PaymentsNotificationService,
    private readonly appointmentFailedPaymentCancelService: AppointmentFailedPaymentCancelService,
    private readonly paymentsExternalOperationsService: PaymentsExternalOperationsService,
    private readonly queueInitializeService: QueueInitializeService,
  ) {}

  /**
   * Authorizes payment via Stripe for individual clients.
   *
   * Attempts Stripe authorization, creates payment record, and handles the result.
   * On success, returns successful result. On failure, redirects to wait list or fails
   * based on options. Sends failure notification if authorization fails.
   *
   * @param manager - Entity manager for transaction
   * @param context - Authorization context with appointment and pricing data
   * @param options - Authorization options including additional time and short time slot flags
   * @returns Success result if authorization completed successfully
   * @throws {InternalServerErrorException} If authorization process fails
   */
  public async authorizePayment(
    manager: EntityManager,
    context: TAuthorizePaymentContext,
  ): Promise<IPaymentOperationResult> {
    const { appointment } = context;
    try {
      const externalOperationResult = await this.paymentsExternalOperationsService.attemptStripeAuthorization(context);
      await this.createAuthorizationPaymentRecord(manager, context, externalOperationResult);

      if (externalOperationResult.status === EPaymentStatus.AUTHORIZED) {
        return await this.handleSuccessfulAuthorization(context);
      } else {
        return await this.handleAuthorizationFailure(manager, context);
      }
    } catch (error) {
      this.lokiLogger.error(`Failed to authorize payment for appointmentId: ${appointment.id}`, (error as Error).stack);
      throw new InternalServerErrorException(EPaymentsErrorCodes.AUTHORIZE_PAYMENT_FAILED);
    }
  }

  /**
   * Handles auth failure for group appointments: Cancels/queues related orders.
   * Skips the current appointment.
   *
   * @param manager - Transaction manager.
   * @param context - Auth context with appointment/group.
   * @throws Error if cancel/queue fails (logged, but propagates).
   */
  public async handleGroupAppointmentAuthFailure(
    manager: EntityManager,
    context: IAuthorizationPaymentContext,
  ): Promise<void> {
    const { appointment } = context;

    if (appointment.appointmentOrder && appointment.appointmentOrder.appointmentOrderGroup) {
      const { appointmentOrderGroup } = appointment.appointmentOrder;
      try {
        for (const appointmentOrder of appointmentOrderGroup.appointmentOrders) {
          if (appointmentOrder.appointment.id === appointment.id) {
            continue;
          }

          await this.appointmentFailedPaymentCancelService.cancelAppointmentPaymentFailed(
            manager,
            appointmentOrder.appointment.id,
          );
          await this.queueInitializeService.addProcessPaymentOperationQueue(
            appointmentOrder.appointment.id,
            EPaymentOperation.AUTHORIZATION_CANCEL_PAYMENT,
            { isCancelledByClient: false },
          );
        }
      } catch (error) {
        this.lokiLogger.error(
          `Failed to cancel related group appointments for appointment ${appointment.id}`,
          (error as Error).stack,
        );
      }
    }
  }

  /**
   * Creates a payment record for Stripe authorization attempt.
   * Used for both success and failure cases.
   *
   * @param manager - Transaction manager for DB ops.
   * @param context - Payment context (prices, appt, etc.).
   * @param externalOperationResult - Stripe result (status, ID, error).
   */
  public async createAuthorizationPaymentRecord(
    manager: EntityManager,
    context: TAuthorizePaymentContext,
    externalOperationResult: IPaymentExternalOperationResult,
  ): Promise<void> {
    const { currency, prices, appointment, existingPayment, paymentMethodInfo } = context;
    await this.paymentsManagementService.createPaymentRecord(manager, {
      direction: EPaymentDirection.INCOMING,
      customerType: EPaymentCustomerType.INDIVIDUAL,
      system: EPaymentSystem.STRIPE,
      fromClient: appointment.client,
      note: externalOperationResult.error,
      status: externalOperationResult.status,
      externalId: externalOperationResult.paymentIntentId,
      existingPayment: existingPayment ?? UNDEFINED_VALUE,
      paymentMethodInfo,
      appointment,
      prices,
      currency,
    });
  }

  private async handleSuccessfulAuthorization(context: IAuthorizationPaymentContext): Promise<IPaymentOperationResult> {
    const { appointment } = context;
    await this.paymentsNotificationService.sendAuthorizationPaymentSuccessNotification(appointment);

    return { success: true };
  }

  private async handleAuthorizationFailure(
    manager: EntityManager,
    context: IAuthorizationPaymentContext,
  ): Promise<IPaymentOperationResult> {
    const { timingContext, appointment, isShortTimeSlot, additionalBlockDuration } = context;

    if (appointment.isGroupAppointment) {
      await this.handleGroupAppointmentAuthFailure(manager, context);
    }

    if (isShortTimeSlot || additionalBlockDuration) {
      return await this.handleFinalFailure(manager, context);
    }

    if (timingContext.isCreatedMoreThan24HoursBeforeStart) {
      return this.handleMoreThan24HoursFailure(manager, context);
    }

    if (timingContext.isCreatedMoreThan6HoursBeforeStart) {
      return this.handleMoreThan6HoursFailure(manager, context);
    }

    throw new InternalServerErrorException(EPaymentsErrorCodes.AUTHORIZE_PAYMENT_FAILED);
  }

  private async handleMoreThan24HoursFailure(
    manager: EntityManager,
    context: IAuthorizationPaymentContext,
  ): Promise<IPaymentOperationResult> {
    const { timingContext } = context;

    if (timingContext.isWithin24AndHalfHourWindow) {
      return await this.handleFinalFailure(manager, context);
    } else {
      return await this.sendNotificationAndRedirectToWaitList(
        manager,
        context,
        EPaymentFailedReason.AUTH_FAILED_MORE_THAN_24H_REPEAT,
        { isFirstAttemptFailed: true, isShortTimeSlot: false },
      );
    }
  }

  private async handleMoreThan6HoursFailure(
    manager: EntityManager,
    context: IAuthorizationPaymentContext,
  ): Promise<IPaymentOperationResult> {
    return await this.sendNotificationAndRedirectToWaitList(
      manager,
      context,
      EPaymentFailedReason.AUTH_FAILED_MORE_THAN_6H_FIRST_ATTEMPT,
      { isFirstAttemptFailed: true, isShortTimeSlot: true },
    );
  }

  private async handleFinalFailure(
    manager: EntityManager,
    context: IAuthorizationPaymentContext,
  ): Promise<IPaymentOperationResult> {
    const { appointment } = context;

    await this.paymentsNotificationService.sendAuthorizationPaymentFailedNotification(
      appointment,
      EPaymentFailedReason.AUTH_FAILED_FINAL,
    );
    await this.appointmentFailedPaymentCancelService.cancelAppointmentPaymentFailed(manager, appointment.id);

    return { success: false };
  }

  private async sendNotificationAndRedirectToWaitList(
    manager: EntityManager,
    context: IAuthorizationPaymentContext,
    reason: EPaymentFailedReason,
    waitListOptions: IRedirectToPaymentWaitListOptions,
  ): Promise<IPaymentOperationResult> {
    const { appointment } = context;
    await this.paymentsNotificationService.sendAuthorizationPaymentFailedNotification(appointment, reason);
    await this.paymentsWaitListService.redirectPaymentToWaitList(manager, context, waitListOptions);

    return { success: true };
  }
}
