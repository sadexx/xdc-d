import { Injectable } from "@nestjs/common";
import { FindManyOptions, FindOneOptions, In } from "typeorm";
import { Attendee, ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import { EAppointmentStatus } from "src/modules/appointments/appointment/common/enums";
import { MultiWayParticipant } from "src/modules/multi-way-participant/entities";
import { UserRole } from "src/modules/users/entities";
import { EUserRoleName } from "src/modules/users/common/enums";
import {
  AttendeeDetailsUserRoleQuery,
  BatchUpdateAttendeeCapabilitiesQuery,
  ChimeMeetingForClosingQuery,
  ExternalUserMeetingConfigQuery,
  InternalUserMeetingConfigQuery,
  MeetingConfigAndAttendeesQuery,
  MeetingConfigByChimeMeetingIdQuery,
  MeetingConfigByClientQuery,
  MeetingConfigByInterpreterQuery,
  MeetingConfigForClientPstnCallsQuery,
  MeetingConfigForParticipantsQuery,
  AttendeeDetailsMultiWayParticipantQuery,
  OnDemandMeetingConfigQuery,
  SuperAdminMeetingConfigQuery,
  UpdateAttendeeCapabilitiesQuery,
  AttendeeDetailsQuery,
  AttendeeByExternalUserIdQuery,
  AddExtraAttendeeInLiveMeetingQuery,
  ChimeMeetingConfigUpdateQuery,
} from "src/modules/chime-meeting-configuration/common/types";
import { CLIENT_ROLES, INTERPRETER_ROLES } from "src/common/constants";

@Injectable()
export class ChimeMeetingQueryOptionsService {
  /**
   ** MeetingCreationService
   */

  public async getAnonymousAttendeeCountOptions(chimeMeetingId: string): Promise<FindManyOptions<Attendee>> {
    return {
      where: {
        chimeMeetingConfiguration: { chimeMeetingId: chimeMeetingId },
        isAnonymousGuest: true,
      },
    };
  }

  public getAddExtraAttendeeInLiveMeetingOptions(
    chimeMeetingId: string,
    clientId: string,
  ): FindOneOptions<ChimeMeetingConfiguration> {
    return {
      select: AddExtraAttendeeInLiveMeetingQuery.select,
      where: {
        chimeMeetingId: chimeMeetingId,
        appointment: { clientId: clientId, status: EAppointmentStatus.LIVE },
      },
      relations: AddExtraAttendeeInLiveMeetingQuery.relations,
    };
  }

  public getChimeMeetingConfigUpdateOptions(appointmentId: string): FindOneOptions<ChimeMeetingConfiguration> {
    return {
      select: ChimeMeetingConfigUpdateQuery.select,
      where: { appointmentId: appointmentId },
    };
  }

  /**
   ** AttendeeManagementService
   */

  public getMeetingConfigAndAttendeesOptions(appointmentId: string): FindOneOptions<ChimeMeetingConfiguration> {
    return {
      select: MeetingConfigAndAttendeesQuery.select,
      where: { appointmentId: appointmentId, appointment: { status: EAppointmentStatus.LIVE } },
      relations: MeetingConfigAndAttendeesQuery.relations,
    };
  }

  public getAttendeeDetailsOptions(meetingId: string, attendeeId: string): FindOneOptions<Attendee> {
    return {
      select: AttendeeDetailsQuery.select,
      where: { attendeeId: attendeeId, chimeMeetingConfiguration: { chimeMeetingId: meetingId } },
    };
  }

  public getAttendeeDetailsMultiWayParticipantOptions(externalUserId: string): FindOneOptions<MultiWayParticipant> {
    return {
      select: AttendeeDetailsMultiWayParticipantQuery.select,
      where: { id: externalUserId },
    };
  }

  public getAttendeeDetailsUserRoleOptions(externalUserId: string): FindOneOptions<UserRole> {
    return {
      select: AttendeeDetailsUserRoleQuery.select,
      where: { id: externalUserId },
      relations: AttendeeDetailsUserRoleQuery.relations,
    };
  }

  public getBatchUpdateAttendeeCapabilitiesOptions(
    chimeMeetingId: string,
    externalUserId: string,
  ): FindOneOptions<ChimeMeetingConfiguration> {
    return {
      select: BatchUpdateAttendeeCapabilitiesQuery.select,
      where: { chimeMeetingId: chimeMeetingId, attendees: { externalUserId: externalUserId } },
      relations: BatchUpdateAttendeeCapabilitiesQuery.relations,
      relationLoadStrategy: "query",
    };
  }

  public getUpdateAttendeeCapabilitiesOptions(
    chimeMeetingId: string,
    attendeeId: string,
  ): FindOneOptions<ChimeMeetingConfiguration> {
    return {
      select: UpdateAttendeeCapabilitiesQuery.select,
      where: { chimeMeetingId: chimeMeetingId, attendees: { attendeeId: attendeeId } },
      relations: UpdateAttendeeCapabilitiesQuery.relations,
    };
  }

  public getAttendeeByExternalUserIdOptions(meetingConfigId: string, externalUserId: string): FindOneOptions<Attendee> {
    return {
      select: AttendeeByExternalUserIdQuery.select,
      where: {
        externalUserId: externalUserId,
        chimeMeetingConfigurationId: meetingConfigId,
      },
    };
  }

  /**
   ** MeetingJoinService
   */

  public getSuperAdminMeetingConfigOptions(appointmentId: string): FindOneOptions<ChimeMeetingConfiguration> {
    return {
      select: SuperAdminMeetingConfigQuery.select,
      where: { appointmentId: appointmentId },
      relations: SuperAdminMeetingConfigQuery.relations,
    };
  }

  public getOnDemandMeetingConfigOptions(appointmentId: string): FindOneOptions<ChimeMeetingConfiguration> {
    return {
      select: OnDemandMeetingConfigQuery.select,
      where: { appointmentId: appointmentId },
      relations: OnDemandMeetingConfigQuery.relations,
    };
  }

  public getInternalUserMeetingConfigOptions(
    appointmentId: string,
    userRoleId: string,
  ): FindOneOptions<ChimeMeetingConfiguration> {
    return {
      select: InternalUserMeetingConfigQuery.select,
      where: { appointmentId: appointmentId, attendees: { externalUserId: userRoleId } },
      relations: InternalUserMeetingConfigQuery.relations,
      relationLoadStrategy: "query",
    };
  }

  public getExternalUserMeetingConfigOptions(
    appointmentId: string,
    externalUserId: string,
  ): FindOneOptions<ChimeMeetingConfiguration> {
    return {
      select: ExternalUserMeetingConfigQuery.select,
      where: { appointmentId: appointmentId, attendees: { externalUserId: externalUserId } },
      relations: ExternalUserMeetingConfigQuery.relations,
      relationLoadStrategy: "query",
    };
  }

  /**
   ** SipMediaService
   */

  public getMeetingConfigByChimeMeetingIdOptions(chimeMeetingId: string): FindOneOptions<ChimeMeetingConfiguration> {
    return {
      select: MeetingConfigByChimeMeetingIdQuery.select,
      where: { chimeMeetingId: chimeMeetingId },
      relations: MeetingConfigByChimeMeetingIdQuery.relations,
    };
  }

  public getMeetingConfigByClientOptions(
    chimeMeetingId: string,
    clientId: string,
  ): FindOneOptions<ChimeMeetingConfiguration> {
    return {
      select: MeetingConfigByClientQuery.select,
      where: {
        chimeMeetingId: chimeMeetingId,
        appointment: { clientId: clientId },
        attendees: { roleName: In(INTERPRETER_ROLES) },
      },
      relations: MeetingConfigByClientQuery.relations,
    };
  }

  public getMeetingConfigByInterpreterOptions(
    chimeMeetingId: string,
    interpreterId: string,
  ): FindOneOptions<ChimeMeetingConfiguration> {
    return {
      select: MeetingConfigByInterpreterQuery.select,
      where: {
        chimeMeetingId: chimeMeetingId,
        appointment: { interpreterId: interpreterId },
        attendees: { roleName: In(CLIENT_ROLES) },
      },
      relations: MeetingConfigByInterpreterQuery.relations,
    };
  }

  public getMeetingConfigForParticipantsOptions(
    chimeMeetingId: string,
    clientId: string,
  ): FindOneOptions<ChimeMeetingConfiguration> {
    return {
      select: MeetingConfigForParticipantsQuery.select,
      where: {
        chimeMeetingId: chimeMeetingId,
        appointment: { clientId: clientId },
        attendees: { roleName: EUserRoleName.INVITED_GUEST },
      },
      relations: MeetingConfigForParticipantsQuery.relations,
    };
  }

  public getMeetingConfigForClientPstnCallsOptions(
    chimeMeetingId: string,
    clientId: string,
  ): FindOneOptions<ChimeMeetingConfiguration> {
    return {
      select: MeetingConfigForClientPstnCallsQuery.select,
      where: {
        chimeMeetingId: chimeMeetingId,
        appointment: { clientId: clientId },
        attendees: { externalUserId: clientId },
      },
      relations: MeetingConfigForClientPstnCallsQuery.relations,
    };
  }

  /**
   ** MeetingClosingService
   */

  public getChimeMeetingForClosingOptions(chimeMeetingId: string): FindOneOptions<ChimeMeetingConfiguration> {
    return {
      select: ChimeMeetingForClosingQuery.select,
      where: { chimeMeetingId: chimeMeetingId },
      relations: ChimeMeetingForClosingQuery.relations,
    };
  }
}
