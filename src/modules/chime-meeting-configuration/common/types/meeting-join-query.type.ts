import { FindOptionsRelations, FindOptionsSelect } from "typeorm";
import { ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import { NonNullableProperties, QueryResultType } from "src/common/types";
import { Appointment } from "src/modules/appointments/appointment/entities";

/**
 ** Type
 */

export type TMeetingConfigForJoin = Pick<
  ChimeMeetingConfiguration,
  | "id"
  | "appointmentId"
  | "chimeMeetingId"
  | "meetingScheduledStartTime"
  | "echoReduction"
  | "maxVideoResolution"
  | "maxContentResolution"
  | "maxAttendees"
  | "meetingLaunchTime"
  | "mediaRegion"
  | "callRecordingEnabled"
  | "meeting"
> & {
  attendees: TInternalUserMeetingConfig["attendees"];
};

export type TAppointmentForStatusCheck = Pick<Appointment, "id" | "status">;
export type TAppointmentForBusinessStartTime = Pick<
  Appointment,
  "id" | "scheduledStartTime" | "schedulingDurationMin" | "businessStartTime"
>;

/**
 ** Queries types
 */

export const SuperAdminMeetingConfigQuery = {
  select: {
    id: true,
    appointmentId: true,
    chimeMeetingId: true,
    mediaRegion: true,
    meeting: true,
    appointment: {
      id: true,
      schedulingType: true,
      communicationType: true,
      status: true,
      operatedByCompanyId: true,
      operatedByCompanyName: true,
      appointmentOrder: {
        id: true,
      },
      appointmentAdminInfo: {
        id: true,
        isRedFlagEnabled: true,
      },
    },
  } as const satisfies FindOptionsSelect<ChimeMeetingConfiguration>,
  relations: {
    attendees: true,
    appointment: { appointmentOrder: true, appointmentAdminInfo: true },
  } as const satisfies FindOptionsRelations<ChimeMeetingConfiguration>,
};
export type TSuperAdminMeetingConfig = QueryResultType<
  ChimeMeetingConfiguration,
  typeof SuperAdminMeetingConfigQuery.select
>;

export type TMeetingConfigForSuperAdminJoin = NonNullableProperties<
  TSuperAdminMeetingConfig,
  "mediaRegion" | "meeting" | "chimeMeetingId"
>;

export const OnDemandMeetingConfigQuery = {
  select: {
    id: true,
    appointmentId: true,
    chimeMeetingId: true,
    mediaRegion: true,
    meeting: true,
    appointment: {
      id: true,
      communicationType: true,
      status: true,
      scheduledStartTime: true,
      schedulingDurationMin: true,
      businessStartTime: true,
    },
  } as const satisfies FindOptionsSelect<ChimeMeetingConfiguration>,
  relations: { attendees: true, appointment: true } as const satisfies FindOptionsRelations<ChimeMeetingConfiguration>,
};
export type TOnDemandMeetingConfig = QueryResultType<
  ChimeMeetingConfiguration,
  typeof OnDemandMeetingConfigQuery.select
>;
export type TMeetingConfigForOnDemandJoin = NonNullableProperties<
  TOnDemandMeetingConfig,
  "mediaRegion" | "meeting" | "chimeMeetingId"
>;

export const InternalUserMeetingConfigQuery = {
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
    callRecordingEnabled: true,
    isClientWasOnlineInBooking: true,
    isInterpreterWasOnlineInBooking: true,
    meeting: true,
    attendees: true,
    appointment: {
      id: true,
      status: true,
      schedulingType: true,
      scheduledStartTime: true,
      schedulingDurationMin: true,
      businessStartTime: true,
      appointmentAdminInfo: {
        id: true,
      },
    },
  } as const satisfies FindOptionsSelect<ChimeMeetingConfiguration>,
  relations: {
    attendees: true,
    appointment: { appointmentAdminInfo: true },
  } as const satisfies FindOptionsRelations<ChimeMeetingConfiguration>,
};
export type TInternalUserMeetingConfig = QueryResultType<
  ChimeMeetingConfiguration,
  typeof InternalUserMeetingConfigQuery.select
>;

export const ExternalUserMeetingConfigQuery = {
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
    callRecordingEnabled: true,
    meeting: true,
    attendees: true,
    appointment: {
      id: true,
      status: true,
    },
  } as const satisfies FindOptionsSelect<ChimeMeetingConfiguration>,
  relations: { attendees: true, appointment: true } as const satisfies FindOptionsRelations<ChimeMeetingConfiguration>,
};
export type TExternalUserMeetingConfig = QueryResultType<
  ChimeMeetingConfiguration,
  typeof ExternalUserMeetingConfigQuery.select
>;
