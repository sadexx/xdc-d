import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { TLoadAppointmentAuthorizationContext } from "src/modules/payment-analysis/common/types/authorization";
import { IAuthorizationPaymentContext } from "src/modules/payment-analysis/common/interfaces/authorization";
import { IncomingPaymentWaitList } from "src/modules/payments-new/entities";
import { EntityManager } from "typeorm";
import { AppointmentFailedPaymentCancelTempService } from "src/modules/appointments/failed-payment-cancel/services";
import {
  IPaymentOperationResult,
  IPaymentWaitList,
  IRedirectToPaymentWaitListOptions,
} from "src/modules/payments-new/common/interfaces";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { PaymentsNotificationService } from "src/modules/payments-new/services";
import { EPaymentFailedReason } from "src/modules/payments-new/common/enums";
import { LokiLogger } from "src/common/logger";

@Injectable()
export class PaymentsWaitListService {
  private readonly lokiLogger = new LokiLogger(PaymentsWaitListService.name);
  constructor(
    private readonly paymentsNotificationService: PaymentsNotificationService,
    private readonly appointmentFailedPaymentCancelService: AppointmentFailedPaymentCancelTempService,
  ) {}

  public async redirectPaymentToWaitList(
    manager: EntityManager,
    context: IAuthorizationPaymentContext,
    options: IRedirectToPaymentWaitListOptions,
  ): Promise<IPaymentOperationResult> {
    try {
      const { appointment, existingWaitListRecord, timingContext } = context;

      if (timingContext.isTooLateForPayment) {
        return await this.handleTooLateScenario(manager, context);
      }

      if (!existingWaitListRecord) {
        return await this.constructAndCreateWaitList(manager, appointment, options);
      } else if (options.isShortTimeSlot) {
        return await this.setWaitListAsShortTimeSlot(manager, existingWaitListRecord.id);
      }

      return { success: true };
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

  private async handleTooLateScenario(
    manager: EntityManager,
    context: IAuthorizationPaymentContext,
  ): Promise<IPaymentOperationResult> {
    const { existingWaitListRecord, appointment } = context;

    if (existingWaitListRecord) {
      await manager.getRepository(IncomingPaymentWaitList).delete({ id: existingWaitListRecord.id });
    }

    await this.appointmentFailedPaymentCancelService.cancelAppointmentPaymentFailed(manager, appointment.id);

    return { success: false };
  }

  private async setWaitListAsShortTimeSlot(manager: EntityManager, id: string): Promise<IPaymentOperationResult> {
    await manager.getRepository(IncomingPaymentWaitList).update({ id }, { isShortTimeSlot: true });

    return { success: true };
  }

  private async constructAndCreateWaitList(
    manager: EntityManager,
    appointment: TLoadAppointmentAuthorizationContext,
    options: IRedirectToPaymentWaitListOptions,
  ): Promise<IPaymentOperationResult> {
    const waitListDto = this.constructWaitListDto(appointment, options);
    await this.createWaitList(manager, waitListDto);

    return { success: true };
  }

  private async createWaitList(manager: EntityManager, dto: IPaymentWaitList): Promise<void> {
    const incomingPaymentWaitListRepository = manager.getRepository(IncomingPaymentWaitList);

    const newWaitListDto = incomingPaymentWaitListRepository.create(dto);
    await incomingPaymentWaitListRepository.save(newWaitListDto);
  }

  private constructWaitListDto(
    appointment: TLoadAppointmentAuthorizationContext,
    options: IRedirectToPaymentWaitListOptions,
  ): IPaymentWaitList {
    const determinedAttemptCount = options.isFirstAttemptFailed ? 1 : 0;
    const determinedTimeSlot = options.isShortTimeSlot ?? false;

    return {
      paymentAttemptCount: determinedAttemptCount,
      isShortTimeSlot: determinedTimeSlot,
      appointment: appointment as Appointment,
    };
  }
}
