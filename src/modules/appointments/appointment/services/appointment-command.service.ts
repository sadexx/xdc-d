import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AppointmentOrder } from "src/modules/appointment-orders/appointment-order/entities";
import {
  EAppointmentCommunicationType,
  EAppointmentErrorCodes,
  EAppointmentSchedulingType,
  EAppointmentStatus,
} from "src/modules/appointments/appointment/common/enums";
import { Appointment, AppointmentAdminInfo } from "src/modules/appointments/appointment/entities";
import { AttendeeManagementService, MeetingJoinService } from "src/modules/chime-meeting-configuration/services";
import { UserRole } from "src/modules/users/entities";
import { Repository } from "typeorm";
import { MessagingCreationService } from "src/modules/chime-messaging-configuration/services";
import { ConfigService } from "@nestjs/config";
import {
  AppointmentNotificationService,
  AppointmentQueryOptionsService,
} from "src/modules/appointments/shared/services";
import { findOneOrFail, findOneOrFailTyped } from "src/common/utils";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { IMessageOutput } from "src/common/outputs";
import { NUMBER_OF_MINUTES_IN_FIVE_MINUTES, NUMBER_OF_MINUTES_IN_TEN_MINUTES } from "src/common/constants";
import { AppointmentOrderSharedLogicService } from "src/modules/appointment-orders/shared/services";
import { IJoinMeetingOutput } from "src/modules/chime-meeting-configuration/common/outputs";
import { ExternalInterpreterFoundDto } from "src/modules/appointments/appointment/common/dto";
import { TAcceptAppointmentOrder } from "src/modules/appointment-orders/appointment-order/common/types";
import { TConfirmExternalInterpreterFound } from "src/modules/appointments/appointment/common/types";
import { addMinutes } from "date-fns";
import { LokiLogger } from "src/common/logger";

@Injectable()
export class AppointmentCommandService {
  private readonly lokiLogger = new LokiLogger(AppointmentCommandService.name);
  private readonly BACK_END_URL: string;

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(AppointmentAdminInfo)
    private readonly appointmentAdminInfoRepository: Repository<AppointmentAdminInfo>,
    private readonly appointmentQueryOptionsService: AppointmentQueryOptionsService,
    private readonly appointmentOrderSharedLogicService: AppointmentOrderSharedLogicService,
    private readonly appointmentNotificationService: AppointmentNotificationService,
    private readonly attendeeManagementService: AttendeeManagementService,
    private readonly meetingJoinService: MeetingJoinService,
    private readonly messagingCreationService: MessagingCreationService,
    private readonly configService: ConfigService,
  ) {
    this.BACK_END_URL = this.configService.getOrThrow<string>("appUrl");
  }

  public async deleteAppointment(id: string, user: ITokenUserData): Promise<void> {
    const queryOptions = this.appointmentQueryOptionsService.getDeleteAppointmentOptions(id, user.id);
    const appointment = await findOneOrFail(id, this.appointmentRepository, queryOptions);

    if (appointment.status !== EAppointmentStatus.CANCELLED_ORDER) {
      throw new BadRequestException(EAppointmentErrorCodes.APPOINTMENT_CANNOT_BE_DELETED);
    }

    const appointmentOrderGroupId = appointment.appointmentOrder?.appointmentOrderGroup?.id;

    if (appointment.appointmentOrder) {
      appointment.appointmentOrder.appointmentOrderGroup = null;
    }

    await this.appointmentRepository.remove(appointment);

    if (appointmentOrderGroupId) {
      await this.appointmentOrderSharedLogicService.deleteAppointmentOrderGroupIfEmpty(appointmentOrderGroupId);
    }

    return;
  }

  public async archiveAppointment(id: string, user: ITokenUserData): Promise<IMessageOutput> {
    const queryOptions = this.appointmentQueryOptionsService.getArchiveAppointmentOptions(id);
    const appointment = await findOneOrFail(id, this.appointmentRepository, queryOptions);

    if (
      appointment.status !== EAppointmentStatus.CANCELLED_ORDER &&
      appointment.status !== EAppointmentStatus.CANCELLED &&
      appointment.status !== EAppointmentStatus.CANCELLED_BY_SYSTEM &&
      appointment.status !== EAppointmentStatus.COMPLETED &&
      appointment.status !== EAppointmentStatus.NO_SHOW
    ) {
      throw new BadRequestException(EAppointmentErrorCodes.APPOINTMENT_CANNOT_BE_ARCHIVED);
    }

    if (appointment.client?.userId === user.id) {
      await this.appointmentRepository.update(id, { archivedByClient: true });
    } else {
      await this.appointmentRepository.update(id, { archivedByInterpreter: true });
    }

    return { message: "Appointment archived successfully." };
  }

  public async sendLateNotification(id: string, user: ITokenUserData): Promise<void> {
    const queryOptions = this.appointmentQueryOptionsService.getSendLateNotificationOptions(id);
    const appointment = await findOneOrFail(id, this.appointmentRepository, queryOptions);
    const lateMinutes =
      appointment.communicationType === EAppointmentCommunicationType.FACE_TO_FACE
        ? NUMBER_OF_MINUTES_IN_TEN_MINUTES
        : NUMBER_OF_MINUTES_IN_FIVE_MINUTES;

    if (appointment.status !== EAppointmentStatus.LIVE) {
      throw new BadRequestException(EAppointmentErrorCodes.APPOINTMENT_MUST_BE_LIVE_FOR_LATE_NOTIFICATION);
    }

    if (appointment.clientId && appointment.interpreterId && appointment.clientId === user.userRoleId) {
      const LATE_NOTIFICATION_LINK = `${this.BACK_END_URL}/v1/appointments/commands/late-notification/${appointment.id}`;

      await this.appointmentNotificationService.sendToInterpreterLateNotification(
        appointment.interpreterId,
        appointment.platformId,
        {
          appointmentId: appointment.id,
          lateNotificationLink: LATE_NOTIFICATION_LINK,
          lateMinutes: String(lateMinutes),
        },
      );
    }

    if (appointment.interpreterId && appointment.clientId && appointment.interpreterId === user.userRoleId) {
      await this.appointmentNotificationService.sendToClientLateNotification(appointment.clientId, lateMinutes, {
        appointmentId: appointment.id,
      });
    }

    return;
  }

  public async confirmExternalInterpreterFound(id: string, dto: ExternalInterpreterFoundDto): Promise<void> {
    const queryOptions = this.appointmentQueryOptionsService.getConfirmExternalInterpreterFoundOptions(id);
    const appointment = await findOneOrFailTyped<TConfirmExternalInterpreterFound>(
      id,
      this.appointmentRepository,
      queryOptions,
    );

    if (!appointment.appointmentAdminInfo) {
      this.lokiLogger.error(`Appointment Admin Info not found in Appointment${id}.`);
      throw new NotFoundException(EAppointmentErrorCodes.APPOINTMENT_ADMIN_INFO_NOT_FOUND);
    }

    const dataForUpdate: Partial<AppointmentAdminInfo> = {
      isInterpreterFound: dto.isInterpreterFound,
    };

    if (dto.notes) {
      dataForUpdate.notes = dto.notes;
    }

    const currentTime = new Date();
    const appointmentUpdateData: Partial<Appointment> = {
      businessStartTime: currentTime,
      internalEstimatedEndTime: addMinutes(currentTime, appointment.schedulingDurationMin),
    };

    if (appointment.communicationType === EAppointmentCommunicationType.VIDEO) {
      appointmentUpdateData.communicationType = EAppointmentCommunicationType.AUDIO;
    }

    await this.appointmentRepository.update(appointment.id, appointmentUpdateData);
    await this.appointmentAdminInfoRepository.update(appointment.appointmentAdminInfo.id, dataForUpdate);
  }

  public async acceptAppointment(
    appointmentOrder: TAcceptAppointmentOrder,
    interpreter: UserRole,
  ): Promise<IMessageOutput | IJoinMeetingOutput> {
    // TODO: SCRIPT:REMOVE
    this.messagingCreationService.createAppointmentChannel(appointmentOrder.appointment, interpreter).catch(() => {});

    if (appointmentOrder.schedulingType === EAppointmentSchedulingType.ON_DEMAND) {
      return await this.acceptOnDemandAppointment(appointmentOrder, interpreter);
    } else {
      return await this.acceptPreBookedAppointment(appointmentOrder, interpreter);
    }
  }

  private async acceptOnDemandAppointment(
    appointmentOrder: TAcceptAppointmentOrder,
    interpreter: UserRole,
  ): Promise<IMessageOutput | IJoinMeetingOutput> {
    if (appointmentOrder.appointment.communicationType === EAppointmentCommunicationType.FACE_TO_FACE) {
      await this.acceptOnDemandFaceToFaceAppointment(appointmentOrder, interpreter);
    } else {
      return await this.acceptOnDemandVirtualAppointment(appointmentOrder, interpreter);
    }

    return { message: "Appointment order accepted successfully." };
  }

  private async acceptOnDemandFaceToFaceAppointment(
    appointmentOrder: TAcceptAppointmentOrder,
    interpreter: UserRole,
  ): Promise<void> {
    await this.appointmentRepository.update(appointmentOrder.appointment.id, {
      interpreter: interpreter,
      status: EAppointmentStatus.ACCEPTED,
      acceptedDate: new Date(),
    });

    if (appointmentOrder.appointment.appointmentAdminInfo) {
      await this.updateAppointmentAdminInfo(appointmentOrder.appointment.appointmentAdminInfo, interpreter);
    }
  }

  private async acceptOnDemandVirtualAppointment(
    appointmentOrder: TAcceptAppointmentOrder,
    interpreter: UserRole,
  ): Promise<IJoinMeetingOutput> {
    await this.appointmentRepository.update(appointmentOrder.appointment.id, {
      interpreter: interpreter,
      acceptedDate: new Date(),
    });

    if (appointmentOrder.appointment.appointmentAdminInfo) {
      await this.updateAppointmentAdminInfo(appointmentOrder.appointment.appointmentAdminInfo, interpreter);
    }

    return await this.meetingJoinService.joinOnDemandMeeting(appointmentOrder as AppointmentOrder, interpreter);
  }

  private async acceptPreBookedAppointment(
    appointmentOrder: TAcceptAppointmentOrder,
    interpreter: UserRole,
  ): Promise<IMessageOutput> {
    await this.appointmentRepository.update(appointmentOrder.appointment.id, {
      interpreter: interpreter,
      status: EAppointmentStatus.ACCEPTED,
      acceptedDate: new Date(),
    });

    if (appointmentOrder.appointment.appointmentAdminInfo) {
      await this.updateAppointmentAdminInfo(appointmentOrder.appointment.appointmentAdminInfo, interpreter);
    }

    if (
      !appointmentOrder.appointment.alternativePlatform &&
      appointmentOrder.appointment.communicationType !== EAppointmentCommunicationType.FACE_TO_FACE
    ) {
      return await this.attendeeManagementService.addInterpreterToPreBookedMeeting(appointmentOrder, interpreter);
    }

    return { message: "Appointment order accepted successfully." };
  }

  // TODO: Refactor O
  public async updateAppointmentAdminInfo(
    appointmentAdminInfo: { id: string; isRedFlagEnabled: boolean },
    interpreter?: UserRole,
  ): Promise<void> {
    if (appointmentAdminInfo) {
      await this.appointmentAdminInfoRepository.update(appointmentAdminInfo.id, {
        interpreterFirstName: interpreter ? interpreter.profile.firstName : null,
        interpreterPreferredName: interpreter ? interpreter.profile.preferredName : null,
        interpreterLastName: interpreter ? interpreter.profile.lastName : null,
        interpreterPhone: interpreter ? interpreter.user.phoneNumber : null,
        interpreterEmail: interpreter ? interpreter.profile.contactEmail : null,
        interpreterDateOfBirth: interpreter ? interpreter.profile.dateOfBirth : null,
        isInterpreterFound: interpreter ? true : false,
        isRedFlagEnabled: interpreter ? false : appointmentAdminInfo.isRedFlagEnabled,
      });
    }
  }
}
