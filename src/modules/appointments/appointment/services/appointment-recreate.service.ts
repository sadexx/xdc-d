import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateFaceToFaceAppointmentAddressDto } from "src/modules/addresses/common/dto";
import { MeetingCreationService, AttendeeCreationService } from "src/modules/chime-meeting-configuration/services";
import { MultiWayParticipantService } from "src/modules/multi-way-participant/services";
import { UpdateAppointmentDto } from "src/modules/appointments/appointment/common/dto";
import {
  EAppointmentParticipantType,
  EAppointmentCommunicationType,
  EAppointmentRecreationType,
  EAppointmentStatus,
} from "src/modules/appointments/appointment/common/enums";
import { Appointment, AppointmentReminder } from "src/modules/appointments/appointment/entities";
import {
  IRecreateAppointment,
  IRecreatedAppointmentWithOldAppointment,
} from "src/modules/appointments/appointment/common/interfaces";
import { addMinutes } from "date-fns";
import { findOneOrFail } from "src/common/utils";
import { AppointmentCreateService } from "src/modules/appointments/appointment/services";
import { AppointmentQueryOptionsService, AppointmentSharedService } from "src/modules/appointments/shared/services";
import { Address } from "src/modules/addresses/entities";
import { MessagingResolveService } from "src/modules/chime-messaging-configuration/services";
import { AppointmentOrderSharedLogicService } from "src/modules/appointment-orders/shared/services";
import { UserRole } from "src/modules/users/entities";
import { MultiWayParticipant } from "src/modules/multi-way-participant/entities";
import { ICreateMultiWayParticipant } from "src/modules/multi-way-participant/common/interfaces";
import { TRecreateAppointment } from "src/modules/appointments/appointment/common/types";
import { Attendee } from "src/modules/chime-meeting-configuration/entities";

@Injectable()
export class AppointmentRecreateService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    private readonly appointmentCreateService: AppointmentCreateService,
    private readonly appointmentQueryOptionsService: AppointmentQueryOptionsService,
    private readonly appointmentOrderSharedLogicService: AppointmentOrderSharedLogicService,
    private readonly appointmentSharedService: AppointmentSharedService,
    private readonly messagingResolveService: MessagingResolveService,
    private readonly multiWayParticipantService: MultiWayParticipantService,
    private readonly attendeeCreationService: AttendeeCreationService,
    private readonly meetingCreationService: MeetingCreationService,
  ) {}

  public async processAppointmentRecreation(
    oldAppointmentId: string,
    dto: UpdateAppointmentDto,
    recreationType: EAppointmentRecreationType,
    updatedAddress?: Address,
  ): Promise<IRecreatedAppointmentWithOldAppointment[]> {
    const queryOptions = this.appointmentQueryOptionsService.getRecreateAppointmentOptions(oldAppointmentId);
    const oldAppointment = (await findOneOrFail(
      oldAppointmentId,
      this.appointmentRepository,
      queryOptions,
    )) as TRecreateAppointment;

    const recreatedAppointment = await this.recreateAppointment(oldAppointment, dto, updatedAddress);

    const recreatedAppointmentsWithOldAppointments: IRecreatedAppointmentWithOldAppointment[] = [
      { oldAppointment: oldAppointment as Appointment, recreatedAppointment },
    ];

    await this.cleanupOldAppointment(oldAppointment);

    if (recreationType === EAppointmentRecreationType.GROUP && oldAppointment.appointmentsGroupId) {
      await this.processAppointmentGroupRecreation(
        dto,
        oldAppointment.appointmentsGroupId,
        recreatedAppointment.id,
        recreatedAppointmentsWithOldAppointments,
      );
    }

    return recreatedAppointmentsWithOldAppointments;
  }

  private async processAppointmentGroupRecreation(
    dto: UpdateAppointmentDto,
    appointmentsGroupId: string,
    recreatedAppointmentId: string,
    recreatedAppointmentsWithOldAppointments: IRecreatedAppointmentWithOldAppointment[],
  ): Promise<IRecreatedAppointmentWithOldAppointment[]> {
    const queryOptions = this.appointmentQueryOptionsService.getGroupRecreationOptions(
      appointmentsGroupId,
      recreatedAppointmentId,
    );
    const oldAppointmentGroup = (await this.appointmentRepository.find(queryOptions)) as TRecreateAppointment[];

    if (oldAppointmentGroup.length > 0) {
      const groupDto: Partial<UpdateAppointmentDto> = {
        topic: dto.topic,
        preferredInterpreterGender: dto.preferredInterpreterGender,
        languageFrom: dto.languageFrom,
        languageTo: dto.languageTo,
      };

      for (const oldAppointment of oldAppointmentGroup) {
        const recreatedAppointment = await this.recreateAppointment(oldAppointment, groupDto);
        await this.cleanupOldAppointment(oldAppointment);

        recreatedAppointmentsWithOldAppointments.push({
          oldAppointment: oldAppointment as Appointment,
          recreatedAppointment,
        });
      }
    }

    return recreatedAppointmentsWithOldAppointments;
  }

  private async recreateAppointment(
    oldAppointment: TRecreateAppointment,
    dto: Partial<UpdateAppointmentDto>,
    updatedAddress?: Address,
  ): Promise<Appointment> {
    const newAppointment = await this.constructAndRecreateAppointment(oldAppointment, dto);

    let participants: MultiWayParticipant[] = [];
    let attendees: Attendee[] = [];

    if (
      oldAppointment.participantType === EAppointmentParticipantType.MULTI_WAY &&
      oldAppointment.participants &&
      oldAppointment.participants.length > 0
    ) {
      participants = await this.multiWayParticipantService.createMultiWayParticipants(
        oldAppointment.participants as unknown as ICreateMultiWayParticipant[],
        newAppointment,
      );
    }

    if (
      oldAppointment.communicationType !== EAppointmentCommunicationType.FACE_TO_FACE &&
      oldAppointment.alternativePlatform === false
    ) {
      const meetingConfig = await this.meetingCreationService.constructAndCreateMeetingConfiguration(
        newAppointment,
        oldAppointment.participants?.length ?? 0,
      );

      if (oldAppointment.client) {
        attendees = await this.attendeeCreationService.constructAndCreateAttendees(
          oldAppointment.client as UserRole,
          (oldAppointment.participants ?? []) as MultiWayParticipant[],
          newAppointment,
          meetingConfig,
        );
      }
    }

    if (oldAppointment.communicationType === EAppointmentCommunicationType.FACE_TO_FACE) {
      await this.appointmentCreateService.constructAndCreateFaceToFaceAppointmentAddress(
        (updatedAddress ?? oldAppointment.address) as CreateFaceToFaceAppointmentAddressDto,
        newAppointment,
      );
    }

    await this.appointmentCreateService.createAppointmentAdminInfo(newAppointment);

    await this.appointmentSharedService.sendParticipantsInvitations(
      newAppointment,
      oldAppointment.client as UserRole,
      participants,
      attendees,
    );

    return newAppointment;
  }

  private async constructAndRecreateAppointment(
    oldAppointment: TRecreateAppointment,
    dto: Partial<UpdateAppointmentDto>,
  ): Promise<Appointment> {
    const recreateAppointmentDto = this.constructRecreateAppointmentDto(oldAppointment, dto);
    const savedAppointment = await this.createAppointment(recreateAppointmentDto);

    return savedAppointment;
  }

  private async createAppointment(dto: IRecreateAppointment): Promise<Appointment> {
    const newAppointment = this.appointmentRepository.create(dto);
    const savedAppointment = await this.appointmentRepository.save(newAppointment);

    return savedAppointment;
  }

  private constructRecreateAppointmentDto(
    oldAppointment: TRecreateAppointment,
    dto: Partial<UpdateAppointmentDto>,
  ): IRecreateAppointment {
    if (!oldAppointment.client || !oldAppointment.client.timezone) {
      throw new BadRequestException("Failed to construct appointment recreate dto.");
    }

    const determinedScheduledStartTime = dto.scheduledStartTime ?? oldAppointment.scheduledStartTime;
    const determinedSchedulingDurationMin = dto.schedulingDurationMin ?? oldAppointment.schedulingDurationMin;
    const determinedScheduledEndTime = addMinutes(determinedScheduledStartTime, determinedSchedulingDurationMin);

    const appointmentDto: IRecreateAppointment = {
      client: oldAppointment.client,
      scheduledStartTime: determinedScheduledStartTime,
      scheduledEndTime: determinedScheduledEndTime,
      communicationType: oldAppointment.communicationType,
      schedulingType: oldAppointment.schedulingType,
      schedulingDurationMin: determinedSchedulingDurationMin,
      topic: dto.topic ?? oldAppointment.topic,
      preferredInterpreterGender: dto.preferredInterpreterGender ?? oldAppointment.preferredInterpreterGender,
      interpreterType: oldAppointment.interpreterType,
      interpretingType: oldAppointment.interpretingType,
      simultaneousInterpretingType: oldAppointment.simultaneousInterpretingType,
      languageFrom: dto.languageFrom ?? oldAppointment.languageFrom,
      languageTo: dto.languageTo ?? oldAppointment.languageTo,
      participantType: dto.participantType ?? oldAppointment.participantType,
      alternativePlatform: dto.alternativePlatform ?? oldAppointment.alternativePlatform,
      alternativeVideoConferencingPlatformLink:
        dto.alternativeVideoConferencingPlatformLink ?? oldAppointment.alternativeVideoConferencingPlatformLink,
      notes: dto.notes ?? oldAppointment.notes,
      schedulingExtraDay: oldAppointment.schedulingExtraDay,
      isGroupAppointment: oldAppointment.isGroupAppointment,
      appointmentsGroupId: oldAppointment.appointmentsGroupId,
      sameInterpreter: oldAppointment.sameInterpreter,
      operatedByCompanyName: oldAppointment.client.operatedByCompanyName,
      operatedByCompanyId: oldAppointment.client.operatedByCompanyId,
      operatedByMainCorporateCompanyName: oldAppointment.client.operatedByMainCorporateCompanyName,
      operatedByMainCorporateCompanyId: oldAppointment.client.operatedByMainCorporateCompanyId,
      acceptOvertimeRates: dto.acceptOvertimeRates ?? oldAppointment.acceptOvertimeRates,
      timezone: oldAppointment.client.timezone,
      internalEstimatedEndTime: determinedScheduledEndTime,
      appointmentReminder: new AppointmentReminder(),
    };

    return appointmentDto;
  }

  private async cleanupOldAppointment(oldAppointment: TRecreateAppointment): Promise<void> {
    if (oldAppointment.chimeMeetingConfiguration && oldAppointment.interpreterId) {
      await this.appointmentSharedService.deleteChimeMeetingWithAttendees(oldAppointment.chimeMeetingConfiguration);
    }

    if (oldAppointment.appointmentAdminInfo && oldAppointment.appointmentAdminInfo.isRedFlagEnabled) {
      await this.appointmentSharedService.disableRedFlag(oldAppointment);
    }

    if (!oldAppointment.isGroupAppointment && oldAppointment.appointmentOrder) {
      await this.appointmentOrderSharedLogicService.removeAppointmentOrderBatch(oldAppointment.appointmentOrder);
    } else if (oldAppointment.isGroupAppointment && oldAppointment.appointmentOrder?.appointmentOrderGroup) {
      await this.appointmentOrderSharedLogicService.removeGroupAndAssociatedOrders(
        oldAppointment.appointmentOrder.appointmentOrderGroup,
      );
    }

    await this.appointmentRepository.update(oldAppointment.id, { status: EAppointmentStatus.CANCELLED });
    await this.appointmentSharedService.deleteAppointmentReminder(oldAppointment.id);
    await this.appointmentSharedService.deleteAppointmentShortUrls(oldAppointment.id);
    await this.messagingResolveService.handleChannelResolveProcess(oldAppointment.id);
  }
}
