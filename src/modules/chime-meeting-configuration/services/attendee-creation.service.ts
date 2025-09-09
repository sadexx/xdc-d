import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { LokiLogger } from "src/common/logger";
import { Repository } from "typeorm";
import { Attendee, ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import { UserRole } from "src/modules/users/entities";
import { MultiWayParticipant } from "src/modules/multi-way-participant/entities";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { ICreateAttendee } from "src/modules/chime-meeting-configuration/common/interfaces";
import { EExtMediaCapabilities } from "src/modules/chime-meeting-configuration/common/enums";
import { EAppointmentCommunicationType } from "src/modules/appointments/appointment/common/enums";
import { EUserRoleName } from "src/modules/users/common/enums";
import { UNDEFINED_VALUE, ENVIRONMENT, INTERPRETER_AND_CLIENT_ROLES, LFH_ADMIN_ROLES } from "src/common/constants";
import { EEnvironment } from "src/common/enums";
import {
  TMeetingConfigForAddAttendee,
  TMeetingConfigForConstructAttendee,
} from "src/modules/chime-meeting-configuration/common/types";
import { isInRoles } from "src/common/utils";

@Injectable()
export class AttendeeCreationService {
  private readonly lokiLogger = new LokiLogger(AttendeeCreationService.name);
  private readonly BACK_END_URL: string;
  private readonly FRONT_END_URL: string;

  constructor(
    @InjectRepository(ChimeMeetingConfiguration)
    private readonly chimeMeetingConfigurationRepository: Repository<ChimeMeetingConfiguration>,
    @InjectRepository(Attendee)
    private readonly attendeeRepository: Repository<Attendee>,
    private readonly configService: ConfigService,
  ) {
    this.BACK_END_URL = this.configService.getOrThrow<string>("appUrl");
    this.FRONT_END_URL = this.configService.getOrThrow<string>("frontend.uri");
  }

  public async constructAndCreateAttendees(
    client: UserRole,
    participants: MultiWayParticipant[],
    appointment: Appointment,
    meetingConfig: ChimeMeetingConfiguration,
    interpreter?: UserRole,
  ): Promise<Attendee[]> {
    const capabilities = await this.determineAttendeeCapabilities(appointment.id, appointment.communicationType);
    const clientAttendeeDto = await this.constructAttendeeDto(meetingConfig, client.id, client.role.name, capabilities);
    const attendeeDtos: ICreateAttendee[] = [clientAttendeeDto];

    if (interpreter) {
      const interpreterAttendeeDto = await this.constructAttendeeDto(
        meetingConfig,
        interpreter.id,
        interpreter.role.name,
        capabilities,
      );
      attendeeDtos.push(interpreterAttendeeDto);

      await this.chimeMeetingConfigurationRepository.update(meetingConfig.id, {
        maxAttendees: meetingConfig.maxAttendees + 1,
      });
    }

    if (participants.length > 0) {
      for (const participant of participants) {
        const participantAttendeeDto = await this.constructAttendeeDto(
          meetingConfig,
          participant.id,
          EUserRoleName.INVITED_GUEST,
          capabilities,
          participant.phoneCode && participant.phoneNumber
            ? participant.phoneCode + participant.phoneNumber
            : UNDEFINED_VALUE,
        );
        attendeeDtos.push(participantAttendeeDto);
      }
    }

    return await this.createAttendees(attendeeDtos);
  }

  public async determineAttendeeCapabilities(
    id: string,
    communicationType: EAppointmentCommunicationType,
  ): Promise<{
    audioCapabilities: EExtMediaCapabilities;
    videoCapabilities: EExtMediaCapabilities;
    contentCapabilities: EExtMediaCapabilities;
  }> {
    switch (communicationType) {
      case EAppointmentCommunicationType.AUDIO:
        return {
          audioCapabilities: EExtMediaCapabilities.SEND_RECEIVE,
          videoCapabilities: EExtMediaCapabilities.NONE,
          contentCapabilities: EExtMediaCapabilities.NONE,
        };
      case EAppointmentCommunicationType.VIDEO:
        return {
          audioCapabilities: EExtMediaCapabilities.SEND_RECEIVE,
          videoCapabilities: EExtMediaCapabilities.SEND_RECEIVE,
          contentCapabilities: EExtMediaCapabilities.SEND_RECEIVE,
        };
      default:
        this.lokiLogger.error(
          `Invalid communication type for attendee capabilities, appointment Id: ${id}, configuration: ${communicationType}`,
        );
        throw new BadRequestException("Invalid communication type for attendee capabilities");
    }
  }

  public async constructAttendeeDto(
    meetingConfig: TMeetingConfigForConstructAttendee,
    userId: string,
    userRoleName: EUserRoleName,
    capabilities: {
      audioCapabilities: EExtMediaCapabilities;
      videoCapabilities: EExtMediaCapabilities;
      contentCapabilities: EExtMediaCapabilities;
    },
    guestPhoneNumber?: string,
  ): Promise<ICreateAttendee> {
    const baseAttendee: Omit<ICreateAttendee, "joinUrl"> = {
      chimeMeetingConfiguration: meetingConfig,
      externalUserId: userId,
      roleName: userRoleName,
      isOnline: false,
      isAnonymousGuest: false,
      guestPhoneNumber: null,
      ...capabilities,
    };

    if (ENVIRONMENT === EEnvironment.LOCAL) {
      if (isInRoles(INTERPRETER_AND_CLIENT_ROLES, userRoleName)) {
        return {
          ...baseAttendee,
          joinUrl: `${this.BACK_END_URL}/v1/chime/meetings/join/${meetingConfig.appointmentId}`,
        };
      }

      if (isInRoles(LFH_ADMIN_ROLES, userRoleName)) {
        return {
          ...baseAttendee,
          joinUrl: `${this.BACK_END_URL}/v1/chime/meetings/join-admin/${meetingConfig.appointmentId}`,
        };
      }

      if (userRoleName === EUserRoleName.INVITED_GUEST && guestPhoneNumber) {
        return {
          ...baseAttendee,
          guestPhoneNumber: guestPhoneNumber,
          joinUrl: `${this.BACK_END_URL}/v1/chime/meetings/join-external/${meetingConfig.appointmentId}?externalUserId=${userId}`,
        };
      } else {
        return {
          ...baseAttendee,
          isAnonymousGuest: true,
          joinUrl: `${this.BACK_END_URL}/v1/chime/meetings/join-external/${meetingConfig.appointmentId}?externalUserId=${userId}`,
        };
      }
    } else {
      if (isInRoles(INTERPRETER_AND_CLIENT_ROLES, userRoleName)) {
        return {
          ...baseAttendee,
          joinUrl: `${this.BACK_END_URL}/v1/chime/meetings/join/${meetingConfig.appointmentId}`,
        };
      }

      if (isInRoles(LFH_ADMIN_ROLES, userRoleName)) {
        return {
          ...baseAttendee,
          joinUrl: `${this.BACK_END_URL}/v1/chime/meetings/join-admin/${meetingConfig.appointmentId}`,
        };
      }

      if (userRoleName === EUserRoleName.INVITED_GUEST && guestPhoneNumber) {
        return {
          ...baseAttendee,
          guestPhoneNumber: guestPhoneNumber,
          joinUrl: `${this.FRONT_END_URL}/join?externalUserId=${userId}&appointmentId=${meetingConfig.appointmentId}`,
        };
      } else {
        return {
          ...baseAttendee,
          isAnonymousGuest: true,
          joinUrl: `${this.FRONT_END_URL}/join?externalUserId=${userId}&appointmentId=${meetingConfig.appointmentId}`,
        };
      }
    }
  }

  public async createAttendees(dto: ICreateAttendee[]): Promise<Attendee[]> {
    const newAttendees = this.attendeeRepository.create(dto);
    const savedAttendees = await this.attendeeRepository.save(newAttendees);

    return savedAttendees;
  }

  public async addAttendeeToPreBookedMeeting(params: {
    meetingConfig: TMeetingConfigForAddAttendee;
    userId: string;
    roleName: EUserRoleName;
    guestPhoneNumber?: string;
  }): Promise<Attendee> {
    const { meetingConfig, userId, roleName, guestPhoneNumber } = params;

    const capabilities = await this.determineAttendeeCapabilities(
      meetingConfig.appointment.id,
      meetingConfig.appointment.communicationType,
    );
    const attendeeDto = await this.constructAttendeeDto(
      meetingConfig,
      userId,
      roleName,
      capabilities,
      guestPhoneNumber,
    );

    const [attendee] = await this.createAttendees([attendeeDto]);
    await this.chimeMeetingConfigurationRepository.update(meetingConfig.id, {
      maxAttendees: meetingConfig.maxAttendees + 1,
    });

    return attendee;
  }
}
