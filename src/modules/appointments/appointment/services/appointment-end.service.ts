import { Injectable } from "@nestjs/common";
import { Appointment, AppointmentAdminInfo } from "src/modules/appointments/appointment/entities";
import { EntityManager } from "typeorm";
import { EAppointmentSchedulingType, EAppointmentStatus } from "src/modules/appointments/appointment/common/enums";
import { addMinutes, differenceInMinutes, isAfter } from "date-fns";
import { AppointmentRatingService } from "src/modules/appointments/appointment/services";
import { MessagingResolveService } from "src/modules/chime-messaging-configuration/services";
import { LokiLogger } from "src/common/logger";
import { OldGeneralPaymentsService } from "src/modules/payments/services";
import {
  IExternalAppointmentBusinessTimeAndOverage,
  IFinalizeExternalAppointment,
} from "src/modules/appointments/appointment/common/interfaces";
import {
  TAppointmentsWithoutClientVisit,
  TCheckOutAppointment,
  TFinalizeVirtualAppointment,
} from "src/modules/appointments/appointment/common/types";
import { DiscountsService } from "src/modules/discounts/services";
import { AppointmentOrderSharedLogicService } from "src/modules/appointment-orders/shared/services";
import { AppointmentNotificationService, AppointmentSharedService } from "src/modules/appointments/shared/services";
import { UNDEFINED_VALUE } from "src/common/constants";
import { OldEPayInStatus, OldEPaymentFailedReason } from "src/modules/payments/common/enums";

@Injectable()
export class AppointmentEndService {
  private readonly lokiLogger = new LokiLogger(AppointmentEndService.name);

  constructor(
    private readonly appointmentSharedService: AppointmentSharedService,
    private readonly appointmentRatingService: AppointmentRatingService,
    private readonly appointmentOrderSharedLogicService: AppointmentOrderSharedLogicService,
    private readonly appointmentNotificationService: AppointmentNotificationService,
    private readonly messagingResolveService: MessagingResolveService,
    private readonly generalPaymentsService: OldGeneralPaymentsService,
    private readonly discountsService: DiscountsService,
  ) {}

  public async finalizeExternalAppointment(manager: EntityManager, data: IFinalizeExternalAppointment): Promise<void> {
    const { businessStartTime, businessEndTime, overageMinutes, overageStartTime } =
      this.calculateExternalAppointmentBusinessTimeAndOverage(data);
    const { appointment } = data;

    if (overageMinutes > 0) {
      await this.processExternalAppointmentOverageMinutes(manager, appointment, overageMinutes, overageStartTime);
    }

    await manager.getRepository(Appointment).update(appointment.id, {
      status: EAppointmentStatus.COMPLETED,
      businessStartTime,
      businessEndTime,
      internalEstimatedEndTime: businessEndTime,
    });

    await this.appointmentRatingService.createAppointmentRating(manager, appointment.id);
    await this.discountsService.applyDiscountsForAppointment(manager, appointment.id);
    await this.processAppointmentCleanupTasks(appointment.id);

    this.generalPaymentsService.makePayInCaptureAndPayOut(appointment.id).catch((error: Error) => {
      this.lokiLogger.error(`Make payin capture and payout error: ${error.message} `, error.stack);
    });
  }

  public async finalizeChimeVirtualAppointment(
    manager: EntityManager,
    appointment: TFinalizeVirtualAppointment,
    recordingCallDirectory: string,
  ): Promise<void> {
    const appointmentRepository = manager.getRepository(Appointment);

    const businessEndTime = this.calculateChimeAppointmentBusinessTime(appointment);

    await appointmentRepository.update(appointment.id, {
      status: EAppointmentStatus.COMPLETED,
      businessEndTime,
    });

    if (appointment.appointmentAdminInfo) {
      await this.saveS3RecordingKey(manager, appointment.appointmentAdminInfo.id, recordingCallDirectory);
    }

    if (appointment.schedulingType === EAppointmentSchedulingType.ON_DEMAND) {
      await this.processOnDemandAppointmentCleanupTasks(appointment);
    }

    await this.appointmentRatingService.createAppointmentRating(manager, appointment.id);
    await this.discountsService.applyDiscountsForAppointment(manager, appointment.id);
    await this.processAppointmentCleanupTasks(appointment.id);

    this.generalPaymentsService.makePayInCaptureAndPayOut(appointment.id).catch((error: Error) => {
      this.lokiLogger.error(`Make payin capture and payout error: ${error.message} `, error.stack);
    });
  }

  public async finalizeCancelledChimeVirtualAppointment(
    manager: EntityManager,
    appointment: TFinalizeVirtualAppointment,
    cancellationReason: string,
  ): Promise<void> {
    const appointmentRepository = manager.getRepository(Appointment);

    await appointmentRepository.update(appointment.id, {
      status: EAppointmentStatus.CANCELLED_ORDER,
      notes: cancellationReason,
    });

    if (appointment.schedulingType === EAppointmentSchedulingType.ON_DEMAND) {
      if (appointment.appointmentOrder) {
        await this.appointmentOrderSharedLogicService.cancelOnDemandCalls(appointment.appointmentOrder);
      }

      await this.processOnDemandAppointmentCleanupTasks(appointment);
    }

    if (appointment.appointmentAdminInfo && appointment.appointmentAdminInfo.isRedFlagEnabled) {
      await this.appointmentSharedService.disableRedFlag(appointment);
    }

    await this.processAppointmentCleanupTasks(appointment.id);

    this.generalPaymentsService.cancelPayInAuth(appointment as unknown as Appointment).catch((error: Error) => {
      this.lokiLogger.error(`Cancel appointment. Cancel payin error: ${error.message} `, error.stack);
    });
  }

  public async finalizeChimeVirtualAppointmentWithoutClientVisit(
    manager: EntityManager,
    appointment: TAppointmentsWithoutClientVisit,
  ): Promise<void> {
    await manager.getRepository(Appointment).update(appointment.id, {
      status: EAppointmentStatus.NO_SHOW,
      businessStartTime: appointment.scheduledStartTime,
      businessEndTime: appointment.scheduledEndTime,
    });

    await this.discountsService.applyDiscountsForAppointment(manager, appointment.id);
    await this.processAppointmentCleanupTasks(appointment.id);

    this.generalPaymentsService.makePayInCaptureAndPayOut(appointment.id).catch((error: Error) => {
      this.lokiLogger.error(`Make payin capture and payout error: ${error.message} `, error.stack);
    });
  }

  private async processAppointmentCleanupTasks(id: string): Promise<void> {
    await this.appointmentSharedService.deleteAppointmentShortUrls(id);
    await this.messagingResolveService.handleChannelResolveProcess(id);
    await this.appointmentSharedService.deleteAppointmentReminder(id);
    await this.appointmentSharedService.removeLiveAppointmentCacheData(id);
  }

  private async processOnDemandAppointmentCleanupTasks(appointment: TFinalizeVirtualAppointment): Promise<void> {
    if (appointment.appointmentOrder) {
      await this.appointmentOrderSharedLogicService.removeAppointmentOrderBatch(appointment.appointmentOrder);
    }

    if (appointment.interpreterId) {
      await this.appointmentOrderSharedLogicService.makeOnlineInterpreterAfterOnDemand(appointment.interpreterId);
    }
  }

  private calculateExternalAppointmentBusinessTimeAndOverage(
    data: IFinalizeExternalAppointment,
  ): IExternalAppointmentBusinessTimeAndOverage {
    const businessStartTime = data.alternativeStartTime ?? data.scheduledStartTime;
    const expectedBusinessEndTime = addMinutes(businessStartTime, data.schedulingDurationMin);

    const actualEndTime = data.alternativeEndTime ?? data.scheduledEndTime;
    const businessEndTime = isAfter(actualEndTime, expectedBusinessEndTime) ? actualEndTime : expectedBusinessEndTime;

    const actualDurationMin = differenceInMinutes(actualEndTime, businessStartTime);

    const overageMinutes = Math.max(0, actualDurationMin - data.schedulingDurationMin);
    const overageStartTime = addMinutes(businessStartTime, data.schedulingDurationMin);

    return { businessStartTime, businessEndTime, overageMinutes, overageStartTime };
  }

  private calculateChimeAppointmentBusinessTime(appointment: TFinalizeVirtualAppointment): Date {
    if (!appointment.businessStartTime) {
      this.lokiLogger.warn(
        `Business start time is missing for appointment Id: ${appointment.id}, will use scheduled start time.`,
      );
    }

    const businessStartTime = appointment.businessStartTime ?? appointment.scheduledStartTime;
    const expectedBusinessEndTime = addMinutes(businessStartTime, appointment.schedulingDurationMin);

    return expectedBusinessEndTime;
  }

  private async saveS3RecordingKey(manager: EntityManager, id: string, recordingCallDirectory: string): Promise<void> {
    await manager.getRepository(AppointmentAdminInfo).update(id, {
      callRecordingS3Key: recordingCallDirectory,
    });
  }

  // TODO: remove after payments refactor
  private async processExternalAppointmentOverageMinutes(
    manager: EntityManager,
    appointment: TCheckOutAppointment,
    overageMinutes: number,
    overageStartTime: Date,
  ): Promise<void> {
    const discounts = await this.discountsService.fetchDiscountRateForExtension(overageMinutes, appointment);

    const paymentStatus = await this.generalPaymentsService
      .makePayInAuthByAdditionalBlock(appointment, overageMinutes, overageStartTime, discounts ?? UNDEFINED_VALUE)
      .catch(async (error: Error) => {
        this.lokiLogger.error(`Failed to make payin: ${error.message}, appointmentId: ${appointment.id}`, error.stack);

        return OldEPayInStatus.AUTHORIZATION_FAILED;
      });

    if (paymentStatus === OldEPayInStatus.AUTHORIZATION_SUCCESS) {
      if (discounts) {
        await this.discountsService.applyDiscountsForExtension(manager, appointment, discounts);
      }
    } else {
      if (appointment.clientId) {
        await this.appointmentNotificationService.sendAppointmentAuthorizationPaymentFailedNotification(
          appointment.clientId,
          appointment.platformId,
          OldEPaymentFailedReason.OVERAGE_AUTH_FAILED,
          { appointmentId: appointment.id },
        );
      }
    }
  }
}
