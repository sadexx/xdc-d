import { InjectRepository } from "@nestjs/typeorm";
import {
  UpdateAppointmentDto,
  UpdateAppointmentSearchConditionsDto,
} from "src/modules/appointments/appointment/common/dto";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { Repository } from "typeorm";
import { BadRequestException } from "@nestjs/common";
import {
  EAppointmentErrorCodes,
  EAppointmentParticipantType,
  EAppointmentRecreationType,
  EAppointmentStatus,
} from "src/modules/appointments/appointment/common/enums";
import { AppointmentRecreateService } from "src/modules/appointments/appointment/services";
import { AttendeeCreationService, MeetingCreationService } from "src/modules/chime-meeting-configuration/services";
import { findOneOrFail } from "src/common/utils";
import { AppointmentOrderRecreationService } from "src/modules/appointment-orders/workflow/services";
import { UNDEFINED_VALUE } from "src/common/constants";
import { AppointmentOrder } from "src/modules/appointment-orders/appointment-order/entities";
import {
  AppointmentNotificationService,
  AppointmentQueryOptionsService,
  AppointmentSharedService,
} from "src/modules/appointments/shared/services";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { IMessageOutput } from "src/common/outputs";
import { MultiWayParticipantService } from "src/modules/multi-way-participant/services";
import { AppointmentOrderSharedLogicService } from "src/modules/appointment-orders/shared/services";
import { Address } from "src/modules/addresses/entities";
import { UserRole } from "src/modules/users/entities";
import { TUpdateAppointment } from "src/modules/appointments/appointment/common/types";

export class AppointmentUpdateService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    private readonly appointmentQueryOptionsService: AppointmentQueryOptionsService,
    private readonly appointmentRecreateService: AppointmentRecreateService,
    private readonly appointmentNotificationService: AppointmentNotificationService,
    private readonly appointmentOrderSharedLogicService: AppointmentOrderSharedLogicService,
    private readonly appointmentOrderRecreationService: AppointmentOrderRecreationService,
    private readonly appointmentSharedService: AppointmentSharedService,
    private readonly meetingCreationService: MeetingCreationService,
    private readonly attendeeCreationService: AttendeeCreationService,
    private readonly multiWayParticipantService: MultiWayParticipantService,
  ) {}

  public async updateAppointment(id: string, dto: UpdateAppointmentDto, user: ITokenUserData): Promise<IMessageOutput> {
    const queryOptions = this.appointmentQueryOptionsService.getUpdateAppointmentOptions(id, user);
    const appointment = (await findOneOrFail(id, this.appointmentRepository, queryOptions)) as TUpdateAppointment;

    if (appointment.status !== EAppointmentStatus.ACCEPTED && appointment.status !== EAppointmentStatus.PENDING) {
      throw new BadRequestException(EAppointmentErrorCodes.APPOINTMENT_CANNOT_BE_UPDATED);
    }

    if (dto.acceptOvertimeRates !== UNDEFINED_VALUE && appointment.status !== EAppointmentStatus.PENDING) {
      throw new BadRequestException(EAppointmentErrorCodes.OVERTIME_RATES_ONLY_FOR_PENDING);
    }

    await this.appointmentSharedService.isAppointmentChangesRestrictedByTimeLimits(appointment, dto);

    if (dto.scheduledStartTime || dto.schedulingDurationMin) {
      await this.appointmentSharedService.checkConflictAppointmentsBeforeUpdate(
        user.userRoleId,
        appointment.id,
        dto.scheduledStartTime ?? appointment.scheduledStartTime,
        dto.schedulingDurationMin ?? appointment.schedulingDurationMin,
      );
    }

    if (dto.participantType) {
      await this.handleParticipantTypeUpdate(dto, appointment);
    }

    const recreationType = this.getRecreationType(appointment, dto);

    if (recreationType) {
      await this.handleAppointmentAndOrderRecreationProcess(appointment, dto, recreationType);
    } else {
      await this.updateAppointmentData(appointment, dto);

      if (dto.alternativePlatform === true && !appointment.alternativePlatform) {
        await this.setupAlternativePlatform(appointment.id);
      } else if (dto.alternativePlatform === false && appointment.alternativePlatform) {
        await this.setupMeetingConfiguration(appointment.id);
      }
    }

    if (appointment.interpreter) {
      await this.appointmentNotificationService.sendUpdatedAppointmentNotificationToInterpreter(
        appointment.interpreter as UserRole,
        appointment,
        recreationType,
      );
    }

    return { message: "Appointment updated successfully." };
  }

  private async handleAppointmentAndOrderRecreationProcess(
    oldAppointment: TUpdateAppointment,
    dto: UpdateAppointmentDto,
    recreationType: EAppointmentRecreationType,
    updatedAddress?: Address,
  ): Promise<void> {
    const recreatedAppointmentsWithOldAppointments = await this.appointmentRecreateService.processAppointmentRecreation(
      oldAppointment.id,
      dto,
      recreationType,
      updatedAddress,
    );
    await this.appointmentOrderRecreationService.handleOrderRecreationForUpdatedAppointment(
      recreatedAppointmentsWithOldAppointments,
      recreationType,
    );
  }

  private async updateAppointmentData(appointment: TUpdateAppointment, dto: UpdateAppointmentDto): Promise<void> {
    const determinedPlatformLink =
      dto.alternativePlatform === true
        ? (dto.alternativeVideoConferencingPlatformLink ?? appointment.alternativeVideoConferencingPlatformLink)
        : null;

    await this.appointmentRepository.update(appointment.id, {
      notes: dto.notes,
      alternativePlatform: dto.alternativePlatform,
      participantType: dto.participantType,
      alternativeVideoConferencingPlatformLink: determinedPlatformLink,
    });
  }

  private async handleParticipantTypeUpdate(dto: UpdateAppointmentDto, appointment: TUpdateAppointment): Promise<void> {
    if (dto.participantType === appointment.participantType) {
      return;
    }

    if (dto.participantType === EAppointmentParticipantType.TWO_WAY) {
      await this.multiWayParticipantService.removeAllParticipantsFromAppointment(appointment);
    }
  }

  private async setupAlternativePlatform(id: string): Promise<void> {
    const queryOptions = this.appointmentQueryOptionsService.getAppointmentWithParticipantsAndClientOptions(id);
    const appointment = await findOneOrFail(id, this.appointmentRepository, queryOptions);

    await this.appointmentSharedService.deleteAppointmentShortUrls(appointment.id);

    if (appointment.chimeMeetingConfiguration) {
      await this.appointmentSharedService.deleteChimeMeetingWithAttendees(appointment.chimeMeetingConfiguration);
    }

    if (appointment.client && appointment.participants) {
      await this.appointmentSharedService.sendParticipantsInvitations(
        appointment,
        appointment.client,
        appointment.participants,
      );
    }
  }

  private async setupMeetingConfiguration(id: string): Promise<void> {
    const queryOptions = this.appointmentQueryOptionsService.getAppointmentWithParticipantsAndClientOptions(id);
    const appointment = await findOneOrFail(id, this.appointmentRepository, queryOptions);

    await this.appointmentSharedService.deleteAppointmentShortUrls(appointment.id);

    const meetingConfig = await this.meetingCreationService.constructAndCreateMeetingConfiguration(
      appointment,
      appointment.participants?.length ?? 0,
    );

    if (appointment.client) {
      const attendees = await this.attendeeCreationService.constructAndCreateAttendees(
        appointment.client,
        appointment.participants ?? [],
        appointment,
        meetingConfig,
        appointment.interpreter ?? UNDEFINED_VALUE,
      );

      if (appointment.participants) {
        await this.appointmentSharedService.sendParticipantsInvitations(
          appointment,
          appointment.client,
          appointment.participants,
          attendees,
        );
      }
    }
  }

  public async handleAppointmentAddressUpdate(
    id: string,
    updatedAddress: Address,
    recreationType: EAppointmentRecreationType,
  ): Promise<void> {
    const queryOptions = this.appointmentQueryOptionsService.getUpdateAppointmentOptions(id);
    const appointment = (await findOneOrFail(id, this.appointmentRepository, queryOptions)) as TUpdateAppointment;

    await this.appointmentSharedService.isAppointmentChangesRestrictedByTimeLimits(
      appointment,
      {} as UpdateAppointmentDto,
      true,
    );

    await this.handleAppointmentAndOrderRecreationProcess(
      appointment,
      {} as UpdateAppointmentDto,
      recreationType,
      updatedAddress,
    );
  }

  public async updateAppointmentSearchConditions(
    id: string,
    dto: UpdateAppointmentSearchConditionsDto,
    user: ITokenUserData,
  ): Promise<IMessageOutput> {
    const queryOptions = this.appointmentQueryOptionsService.getUpdateAppointmentSearchConditionsOptions(
      id,
      user.userRoleId,
    );
    const appointment = await findOneOrFail(id, this.appointmentRepository, queryOptions);
    const appointmentUpdatePayload: Partial<Appointment> = {};
    const appointmentOrderUpdatePayload: Partial<AppointmentOrder> = {
      isFirstSearchCompleted: false,
    };

    if (dto.topic) {
      appointmentUpdatePayload.topic = dto.topic;
      appointmentOrderUpdatePayload.topic = dto.topic;
    }

    if (dto.preferredInterpreterGender !== UNDEFINED_VALUE) {
      appointmentUpdatePayload.preferredInterpreterGender = dto.preferredInterpreterGender;
      appointmentOrderUpdatePayload.preferredInterpreterGender = dto.preferredInterpreterGender;
    }

    if (!appointment.isGroupAppointment) {
      await this.appointmentRepository.update({ id: appointment.id }, appointmentUpdatePayload);
      await this.appointmentOrderSharedLogicService.updateActiveOrderConditions(
        appointment,
        appointmentOrderUpdatePayload,
      );
    } else {
      if (appointment.appointmentsGroupId) {
        await this.appointmentRepository.update(
          { appointmentsGroupId: appointment.appointmentsGroupId },
          appointmentUpdatePayload,
        );
      }

      await this.appointmentOrderSharedLogicService.updateActiveOrderConditions(
        appointment,
        appointmentOrderUpdatePayload,
      );
    }

    return { message: "Appointment search conditions updated successfully" };
  }

  private getRecreationType(
    appointment: TUpdateAppointment,
    dto: UpdateAppointmentDto,
  ): EAppointmentRecreationType | null {
    if (!this.appointmentSharedService.orderNeedsRecreation(appointment, dto)) {
      return null;
    }

    if (!appointment.isGroupAppointment) {
      return EAppointmentRecreationType.SINGLE;
    }

    const isFullGroupChange =
      dto.topic || dto.preferredInterpreterGender || dto.languageFrom || dto.languageTo || appointment.sameInterpreter;

    if (isFullGroupChange) {
      return EAppointmentRecreationType.GROUP;
    } else {
      return EAppointmentRecreationType.SINGLE_IN_GROUP;
    }
  }
}
