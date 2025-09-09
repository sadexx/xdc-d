import { FindOptionsRelations, FindOptionsSelect } from "typeorm";
import { ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import { QueryResultType } from "src/common/types";

export const MeetingConfigByChimeMeetingIdQuery = {
  select: {
    appointment: {
      id: true,
      communicationType: true,
    },
  } as const satisfies FindOptionsSelect<ChimeMeetingConfiguration>,
  relations: { appointment: true } as const satisfies FindOptionsRelations<ChimeMeetingConfiguration>,
};
export type TMeetingConfigByChimeMeetingId = QueryResultType<
  ChimeMeetingConfiguration,
  typeof MeetingConfigByChimeMeetingIdQuery.select
>;

export const MeetingConfigByClientQuery = {
  select: {
    id: true,
    chimeMeetingId: true,
    meetingLaunchTime: true,
    appointment: {
      id: true,
      interpreter: {
        id: true,
        user: {
          phoneNumber: true,
        },
      },
    },
    attendees: { id: true, attendeeId: true },
  } as const satisfies FindOptionsSelect<ChimeMeetingConfiguration>,
  relations: {
    appointment: { interpreter: { user: true } },
    attendees: true,
  } as const satisfies FindOptionsRelations<ChimeMeetingConfiguration>,
};
export type TMeetingConfigByClient = QueryResultType<
  ChimeMeetingConfiguration,
  typeof MeetingConfigByClientQuery.select
>;

export const MeetingConfigByInterpreterQuery = {
  select: {
    id: true,
    chimeMeetingId: true,
    meetingLaunchTime: true,
    appointment: {
      id: true,
      client: {
        id: true,
        user: {
          phoneNumber: true,
        },
      },
    },
    attendees: { id: true, attendeeId: true },
  } as const satisfies FindOptionsSelect<ChimeMeetingConfiguration>,
  relations: {
    appointment: { client: { user: true } },
    attendees: true,
  } as const satisfies FindOptionsRelations<ChimeMeetingConfiguration>,
};
export type TMeetingConfigByInterpreter = QueryResultType<
  ChimeMeetingConfiguration,
  typeof MeetingConfigByInterpreterQuery.select
>;

export const MeetingConfigForParticipantsQuery = {
  select: {
    id: true,
    appointmentId: true,
    chimeMeetingId: true,
    meetingLaunchTime: true,
    attendees: {
      id: true,
      attendeeId: true,
      guestPhoneNumber: true,
    },
  } as const satisfies FindOptionsSelect<ChimeMeetingConfiguration>,
  relations: { attendees: true } as const satisfies FindOptionsRelations<ChimeMeetingConfiguration>,
};
export type TMeetingConfigForParticipants = QueryResultType<
  ChimeMeetingConfiguration,
  typeof MeetingConfigForParticipantsQuery.select
>;

export const MeetingConfigForClientPstnCallsQuery = {
  select: {
    id: true,
    appointmentId: true,
    chimeMeetingId: true,
    meetingLaunchTime: true,
    clientPstnCallCount: true,
    appointment: {
      id: true,
      communicationType: true,
    },
  } as const satisfies FindOptionsSelect<ChimeMeetingConfiguration>,
  relations: { appointment: true } as const satisfies FindOptionsRelations<ChimeMeetingConfiguration>,
};
export type TMeetingConfigForClientPstnCalls = QueryResultType<
  ChimeMeetingConfiguration,
  typeof MeetingConfigForClientPstnCallsQuery.select
>;
