import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { IAuthorizationPaymentContext } from "src/modules/payment-analysis/common/interfaces/authorization";
import {
  IAuthorizePaymentOptions,
  IPaymentOperationResult,
  IRedirectToPaymentWaitListOptions,
} from "src/modules/payments-new/common/interfaces";
import { TLoadAppointmentAuthorizationContext } from "src/modules/payment-analysis/common/types/authorization";
import { StripePaymentsService } from "src/modules/stripe/services";
import { denormalizedAmountToNormalized } from "src/common/utils";
import { TAttemptStripeAuthorization, TCreateAuthorizationPaymentRecord } from "src/modules/payments-new/common/types";
import {
  EPaymentCustomerType,
  EPaymentDirection,
  EPaymentFailedReason,
  EPaymentStatus,
  EPaymentSystem,
} from "src/modules/payments-new/common/enums";
import {
  PaymentsCreationService,
  PaymentsNotificationService,
  PaymentsWaitListService,
} from "src/modules/payments-new/services";
import { AppointmentFailedPaymentCancelTempService } from "src/modules/appointments/failed-payment-cancel/services";
import { LokiLogger } from "src/common/logger";
import { EntityManager } from "typeorm";
import { IStripeOperationResult } from "src/modules/stripe/common/interfaces";
import { UNDEFINED_VALUE } from "src/common/constants";

@Injectable()
export class PaymentsAuthorizationService {
  private readonly lokiLogger = new LokiLogger(PaymentsAuthorizationService.name);
  constructor(
    private readonly paymentsCreationService: PaymentsCreationService,
    private readonly paymentsWaitListService: PaymentsWaitListService,
    private readonly paymentsNotificationService: PaymentsNotificationService,
    private readonly appointmentFailedPaymentCancelService: AppointmentFailedPaymentCancelTempService,
    private readonly stripePaymentsService: StripePaymentsService,
  ) {}

  public async authorizePayment(
    manager: EntityManager,
    context: IAuthorizationPaymentContext,
    options: IAuthorizePaymentOptions,
  ): Promise<IPaymentOperationResult> {
    try {
      const stripeOperationResult = await this.attemptStripeAuthorization(context as TAttemptStripeAuthorization);
      await this.createAuthorizationPaymentRecord(
        manager,
        context as TCreateAuthorizationPaymentRecord,
        stripeOperationResult,
      );

      if (stripeOperationResult.status === EPaymentStatus.AUTHORIZED) {
        return await this.handleSuccessfulAuthorization(context);
      } else {
        return await this.handleAuthorizationFailure(manager, context, options);
      }
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

  private async createAuthorizationPaymentRecord(
    manager: EntityManager,
    context: TCreateAuthorizationPaymentRecord,
    stripeOperationResult: IStripeOperationResult,
  ): Promise<void> {
    const { currency, prices, appointment, existingPayment } = context;
    const determinedPaymentMethodInfo = `Credit Card ${appointment.client.paymentInformation.stripeClientLastFour}`;

    await this.paymentsCreationService.createPaymentRecord(manager, {
      direction: EPaymentDirection.INCOMING,
      customerType: EPaymentCustomerType.INDIVIDUAL,
      system: EPaymentSystem.STRIPE,
      fromClient: appointment.client,
      note: stripeOperationResult.error,
      status: stripeOperationResult.status,
      paymentMethodInfo: determinedPaymentMethodInfo,
      externalId: stripeOperationResult.paymentIntentId,
      existingPayment: existingPayment ?? UNDEFINED_VALUE,
      appointment,
      prices,
      currency,
    });
  }

  private async handleSuccessfulAuthorization(context: IAuthorizationPaymentContext): Promise<IPaymentOperationResult> {
    await this.paymentsNotificationService.sendAuthorizationPaymentSuccessNotification(context.appointment);

    return { success: true };
  }

  // TODO: if this is group appointment - cancel auth in other appointment
  private async handleAuthorizationFailure(
    manager: EntityManager,
    context: IAuthorizationPaymentContext,
    options: IAuthorizePaymentOptions,
  ): Promise<IPaymentOperationResult> {
    const { timingContext } = context;

    if (options.isShortTimeSlot || options.isAdditionalTime) {
      return this.handleFinalFailure(manager, context);
    }

    if (timingContext.isCreatedMoreThan24HoursBeforeStart) {
      return this.handleMoreThan24HoursFailure(manager, context);
    }

    if (timingContext.isCreatedMoreThan6HoursBeforeStart) {
      return this.handleMoreThan6HoursFailure(manager, context);
    }

    return this.handleFinalFailure(manager, context);
  }

  private async handleMoreThan24HoursFailure(
    manager: EntityManager,
    context: IAuthorizationPaymentContext,
  ): Promise<IPaymentOperationResult> {
    const { timingContext, appointment } = context;

    if (timingContext.isWithin24AndHalfHourWindow) {
      await this.sendNotificationAndCancel(manager, appointment, EPaymentFailedReason.AUTH_FAILED_FINAL);
    } else {
      await this.sendNotificationAndRedirectToWaitList(
        manager,
        context,
        EPaymentFailedReason.AUTH_FAILED_MORE_THAN_24H_REPEAT,
        { isFirstAttemptFailed: true, isShortTimeSlot: false },
      );
    }

    return { success: timingContext.isWithin24AndHalfHourWindow ? false : true };
  }

  private async handleMoreThan6HoursFailure(
    manager: EntityManager,
    context: IAuthorizationPaymentContext,
  ): Promise<IPaymentOperationResult> {
    await this.sendNotificationAndRedirectToWaitList(
      manager,
      context,
      EPaymentFailedReason.AUTH_FAILED_MORE_THAN_6H_FIRST_ATTEMPT,
      { isFirstAttemptFailed: true, isShortTimeSlot: true },
    );

    return { success: true };
  }

  private async handleFinalFailure(
    manager: EntityManager,
    context: IAuthorizationPaymentContext,
  ): Promise<IPaymentOperationResult> {
    await this.sendNotificationAndCancel(manager, context.appointment, EPaymentFailedReason.AUTH_FAILED_FINAL);

    return { success: false };
  }

  private async sendNotificationAndCancel(
    manager: EntityManager,
    appointment: TLoadAppointmentAuthorizationContext,
    reason: EPaymentFailedReason,
  ): Promise<void> {
    await this.paymentsNotificationService.sendAuthorizationPaymentFailedNotification(appointment, reason);
    await this.appointmentFailedPaymentCancelService.cancelAppointmentPaymentFailed(manager, appointment.id);
  }

  private async sendNotificationAndRedirectToWaitList(
    manager: EntityManager,
    context: IAuthorizationPaymentContext,
    reason: EPaymentFailedReason,
    waitListOptions: IRedirectToPaymentWaitListOptions,
  ): Promise<void> {
    await this.paymentsNotificationService.sendAuthorizationPaymentFailedNotification(context.appointment, reason);
    await this.paymentsWaitListService.redirectPaymentToWaitList(manager, context, waitListOptions);
  }

  private async attemptStripeAuthorization(context: TAttemptStripeAuthorization): Promise<IStripeOperationResult> {
    const { prices, currency, appointment } = context;

    const idempotencyKey = this.generateAuthorizationIdempotencyKey(context.appointment);
    const normalizedAmount = denormalizedAmountToNormalized(prices.clientFullAmount);

    try {
      const { paymentIntentId } = await this.stripePaymentsService.authorizePayment({
        amount: normalizedAmount,
        currency,
        paymentMethodId: appointment.client.paymentInformation.stripeClientPaymentMethodId,
        customerId: appointment.client.paymentInformation.stripeClientAccountId,
        appointmentPlatformId: appointment.platformId,
        idempotencyKey,
      });

      return {
        status: EPaymentStatus.AUTHORIZED,
        paymentIntentId: paymentIntentId,
      };
    } catch (error) {
      return {
        status: EPaymentStatus.AUTHORIZATION_FAILED,
        error: (error as Error).message,
      };
    }
  }

  private generateAuthorizationIdempotencyKey(appointment: TLoadAppointmentAuthorizationContext): string {
    return `authorization-${appointment.platformId}-${appointment.client.id}`;
  }
}
