import { FindOptionsRelations, FindOptionsSelect } from "typeorm";
import { Attendee, ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import { MultiWayParticipant } from "src/modules/multi-way-participant/entities";
import { UserRole } from "src/modules/users/entities";
import { QueryResultType } from "src/common/types";
import { Appointment } from "src/modules/appointments/appointment/entities";

/**
 ** Type
 */

export type TMeetingConfigForAttendeeCreation = Pick<
  ChimeMeetingConfiguration,
  "id" | "appointmentId" | "chimeMeetingId"
> & {
  chimeMeetingId: string;
  appointment: Pick<Appointment, "id" | "communicationType">;
};

export type TAttendeeRemovalConfig = Pick<ChimeMeetingConfiguration, "id" | "maxAttendees">;

/**
 ** Queries types
 */

export const MeetingConfigAndAttendeesQuery = {
  select: {
    id: true,
    appointmentId: true,
    chimeMeetingId: true,
    meetingScheduledStartTime: true,
    echoReduction: true,
    maxVideoResolution: true,
    maxContentResolution: true,
    maxAttendees: true,
    meetingLaunchTime: true,
    mediaRegion: true,
    clientPstnCallCount: true,
    isClientWasOnlineInBooking: true,
    isInterpreterWasOnlineInBooking: true,
    attendees: true,
  } as const satisfies FindOptionsSelect<ChimeMeetingConfiguration>,
  relations: {
    attendees: true,
  } as const satisfies FindOptionsRelations<ChimeMeetingConfiguration>,
};
export type TMeetingConfigAndAttendees = QueryResultType<
  ChimeMeetingConfiguration,
  typeof MeetingConfigAndAttendeesQuery.select
>;

export const AttendeeDetailsQuery = {
  select: {
    id: true,
    externalUserId: true,
    roleName: true,
    attendeeId: true,
    isOnline: true,
    isAnonymousGuest: true,
    joinUrl: true,
    guestPhoneNumber: true,
    joinToken: true,
    audioCapabilities: true,
    videoCapabilities: true,
    contentCapabilities: true,
  } as const satisfies FindOptionsSelect<Attendee>,
};
export type TAttendeeDetails = QueryResultType<Attendee, typeof AttendeeDetailsQuery.select>;

export const AttendeeDetailsMultiWayParticipantQuery = {
  select: {
    id: true,
    name: true,
  } as const satisfies FindOptionsSelect<MultiWayParticipant>,
};
export type TAttendeeDetailsMultiWayParticipant = QueryResultType<
  MultiWayParticipant,
  typeof AttendeeDetailsMultiWayParticipantQuery.select
>;

export const AttendeeDetailsUserRoleQuery = {
  select: {
    id: true,
    role: {
      name: true,
    },
    profile: {
      firstName: true,
      preferredName: true,
      lastName: true,
      gender: true,
    },
    user: {
      avatarUrl: true,
      platformId: true,
    },
  } as const satisfies FindOptionsSelect<UserRole>,
  relations: {
    user: true,
    role: true,
    profile: true,
  } as const satisfies FindOptionsRelations<UserRole>,
};
export type TAttendeeDetailsUserRole = QueryResultType<UserRole, typeof AttendeeDetailsUserRoleQuery.select>;

export const BatchUpdateAttendeeCapabilitiesQuery = {
  select: {
    id: true,
    chimeMeetingId: true,
    maxVideoResolution: true,
    maxContentResolution: true,
    attendees: {
      id: true,
      roleName: true,
      attendeeId: true,
    },
  } as const satisfies FindOptionsSelect<ChimeMeetingConfiguration>,
  relations: { attendees: true } as const satisfies FindOptionsRelations<ChimeMeetingConfiguration>,
};
export type TBatchUpdateAttendeeCapabilities = QueryResultType<
  ChimeMeetingConfiguration,
  typeof BatchUpdateAttendeeCapabilitiesQuery.select
>;

export const UpdateAttendeeCapabilitiesQuery = {
  select: {
    id: true,
    chimeMeetingId: true,
    maxVideoResolution: true,
    maxContentResolution: true,
    attendees: {
      id: true,
      roleName: true,
      attendeeId: true,
    },
  } as const satisfies FindOptionsSelect<ChimeMeetingConfiguration>,
  relations: { attendees: true } as const satisfies FindOptionsRelations<ChimeMeetingConfiguration>,
};
export type TUpdateAttendeeCapabilities = QueryResultType<
  ChimeMeetingConfiguration,
  typeof UpdateAttendeeCapabilitiesQuery.select
>;

export const ChimeMeetingConfigUpdateQuery = {
  select: {
    id: true,
    appointmentId: true,
    maxAttendees: true,
  } as const satisfies FindOptionsSelect<ChimeMeetingConfiguration>,
};
export type TChimeMeetingConfigUpdate = QueryResultType<
  ChimeMeetingConfiguration,
  typeof ChimeMeetingConfigUpdateQuery.select
>;

export const AddExtraAttendeeInLiveMeetingQuery = {
  select: {
    id: true,
    chimeMeetingId: true,
    appointmentId: true,
    mediaRegion: true,
    appointment: {
      id: true,
      communicationType: true,
    },
  } as const satisfies FindOptionsSelect<ChimeMeetingConfiguration>,
  relations: { appointment: true } as const satisfies FindOptionsRelations<ChimeMeetingConfiguration>,
};
export type TAddExtraAttendeeInLiveMeeting = QueryResultType<
  ChimeMeetingConfiguration,
  typeof AddExtraAttendeeInLiveMeetingQuery.select
>;

export const AttendeeByExternalUserIdQuery = {
  select: {
    id: true,
  } as const satisfies FindOptionsSelect<Attendee>,
};
export type TAttendeeByExternalUserId = QueryResultType<
  ChimeMeetingConfiguration,
  typeof AttendeeByExternalUserIdQuery.select
>;
