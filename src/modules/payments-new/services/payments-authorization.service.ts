import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { IAuthorizationPaymentContext } from "src/modules/payment-analysis/common/interfaces/authorization";
import {
  IAuthorizePaymentOptions,
  IPaymentExternalOperationResult,
  IPaymentOperationResult,
  IRedirectToPaymentWaitListOptions,
} from "src/modules/payments-new/common/interfaces";
import { TLoadAppointmentAuthorizationContext } from "src/modules/payment-analysis/common/types/authorization";
import { TAttemptStripeAuthorization, TCreateAuthorizationPaymentRecord } from "src/modules/payments-new/common/types";
import {
  EPaymentCustomerType,
  EPaymentDirection,
  EPaymentFailedReason,
  EPaymentStatus,
  EPaymentSystem,
} from "src/modules/payments-new/common/enums";
import {
  PaymentsExternalOperationsService,
  PaymentsManagementService,
  PaymentsNotificationService,
  PaymentsWaitListService,
} from "src/modules/payments-new/services";
import { AppointmentFailedPaymentCancelTempService } from "src/modules/appointments/failed-payment-cancel/services";
import { LokiLogger } from "src/common/logger";
import { EntityManager } from "typeorm";
import { UNDEFINED_VALUE } from "src/common/constants";

@Injectable()
export class PaymentsAuthorizationService {
  private readonly lokiLogger = new LokiLogger(PaymentsAuthorizationService.name);
  constructor(
    private readonly paymentsManagementService: PaymentsManagementService,
    private readonly paymentsWaitListService: PaymentsWaitListService,
    private readonly paymentsNotificationService: PaymentsNotificationService,
    private readonly appointmentFailedPaymentCancelService: AppointmentFailedPaymentCancelTempService,
    private readonly paymentsExternalOperationsService: PaymentsExternalOperationsService,
  ) {}

  public async authorizePayment(
    manager: EntityManager,
    context: IAuthorizationPaymentContext,
    options: IAuthorizePaymentOptions,
  ): Promise<IPaymentOperationResult> {
    const { appointment } = context;
    try {
      const externalOperationResult = await this.paymentsExternalOperationsService.attemptStripeAuthorization(
        context as TAttemptStripeAuthorization,
      );
      await this.createAuthorizationPaymentRecord(
        manager,
        context as TCreateAuthorizationPaymentRecord,
        externalOperationResult,
      );

      if (externalOperationResult.status === EPaymentStatus.AUTHORIZED) {
        return await this.handleSuccessfulAuthorization(context);
      } else {
        return await this.handleAuthorizationFailure(manager, context, options);
      }
    } catch (error) {
      await this.paymentsNotificationService.sendAuthorizationPaymentFailedNotification(
        context.appointment,
        EPaymentFailedReason.AUTH_FAILED,
      );
      this.lokiLogger.error(`Failed to authorize payment for appointmentId: ${appointment.id}`, (error as Error).stack);
      throw new InternalServerErrorException("Failed to authorize payment.");
    }
  }

  private async handleSuccessfulAuthorization(context: IAuthorizationPaymentContext): Promise<IPaymentOperationResult> {
    const { appointment } = context;
    await this.paymentsNotificationService.sendAuthorizationPaymentSuccessNotification(appointment);

    return { success: true };
  }

  // TODO: if this is group appointment - cancel auth in other appointment
  private async handleAuthorizationFailure(
    manager: EntityManager,
    context: IAuthorizationPaymentContext,
    options: IAuthorizePaymentOptions,
  ): Promise<IPaymentOperationResult> {
    const { timingContext } = context;
    const { isShortTimeSlot, isAdditionalTime } = options;

    if (isShortTimeSlot || isAdditionalTime) {
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
    const { appointment } = context;
    await this.paymentsNotificationService.sendAuthorizationPaymentFailedNotification(appointment, reason);
    await this.paymentsWaitListService.redirectPaymentToWaitList(manager, context, waitListOptions);
  }

  private async createAuthorizationPaymentRecord(
    manager: EntityManager,
    context: TCreateAuthorizationPaymentRecord,
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
}
