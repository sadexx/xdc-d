import { Injectable } from "@nestjs/common";
import { Appointment, AppointmentAdminInfo } from "src/modules/appointments/appointment/entities";
import { EntityManager } from "typeorm";
import { EAppointmentSchedulingType, EAppointmentStatus } from "src/modules/appointments/appointment/common/enums";
import { addMinutes, differenceInMinutes, isAfter } from "date-fns";
import { AppointmentRatingService } from "src/modules/appointments/appointment/services";
import { MessagingResolveService } from "src/modules/chime-messaging-configuration/services";
import { LokiLogger } from "src/common/logger";
import {
  IExternalAppointmentBusinessTimeAndOverage,
  IFinalizeExternalAppointment,
} from "src/modules/appointments/appointment/common/interfaces";
import {
  TAppointmentsWithoutClientVisit,
  TFinalizeVirtualAppointment,
} from "src/modules/appointments/appointment/common/types";
import { DiscountsService } from "src/modules/discounts/services";
import { AppointmentOrderSharedLogicService } from "src/modules/appointment-orders/shared/services";
import { AppointmentSharedService } from "src/modules/appointments/shared/services";
import { QueueInitializeService } from "src/modules/queues/services";
import { EPaymentOperation } from "src/modules/payments-analysis/common/enums/core";

@Injectable()
export class AppointmentEndService {
  private readonly lokiLogger = new LokiLogger(AppointmentEndService.name);
  constructor(
    private readonly appointmentSharedService: AppointmentSharedService,
    private readonly appointmentRatingService: AppointmentRatingService,
    private readonly appointmentOrderSharedLogicService: AppointmentOrderSharedLogicService,
    private readonly messagingResolveService: MessagingResolveService,
    private readonly discountsService: DiscountsService,
    private readonly queueInitializeService: QueueInitializeService,
  ) {}

  public async finalizeExternalAppointment(manager: EntityManager, data: IFinalizeExternalAppointment): Promise<void> {
    const { businessStartTime, businessEndTime, overageMinutes } =
      this.calculateExternalAppointmentBusinessTimeAndOverage(data);
    const { appointment } = data;

    if (overageMinutes > 0) {
      await this.queueInitializeService.addProcessPaymentOperationQueue(
        appointment.id,
        EPaymentOperation.AUTHORIZE_ADDITIONAL_BLOCK_PAYMENT,
        { isShortTimeSlot: false, additionalBlockDuration: overageMinutes },
      );
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

    await this.queueInitializeService.addProcessPaymentOperationQueue(
      appointment.id,
      EPaymentOperation.CAPTURE_PAYMENT,
      { isSecondAttempt: false },
    );
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

    await this.queueInitializeService.addProcessPaymentOperationQueue(
      appointment.id,
      EPaymentOperation.CAPTURE_PAYMENT,
      { isSecondAttempt: false },
    );
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

    await this.queueInitializeService.addProcessPaymentOperationQueue(
      appointment.id,
      EPaymentOperation.AUTHORIZATION_CANCEL_PAYMENT,
      { isCancelledByClient: false },
    );
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

    await this.queueInitializeService.addProcessPaymentOperationQueue(
      appointment.id,
      EPaymentOperation.CAPTURE_PAYMENT,
      { isSecondAttempt: false },
    );
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

    return { businessStartTime, businessEndTime, overageMinutes };
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
}
