import { FindOptionsRelations, FindOptionsSelect } from "typeorm";
import { ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import { QueryResultType } from "src/common/types";

/**
 ** Queries types
 */

export const ChimeMeetingForClosingQuery = {
  select: {
    id: true,
    chimeMeetingId: true,
    isInterpreterWasOnlineInBooking: true,
    isClientWasOnlineInBooking: true,
    mediaRegion: true,
    mediaPipelineId: true,
    appointmentId: true,
    appointment: {
      id: true,
      platformId: true,
      clientId: true,
      interpreterId: true,
      schedulingType: true,
      scheduledEndTime: true,
      businessStartTime: true,
      businessEndTime: true,
      scheduledStartTime: true,
      interpreterType: true,
      communicationType: true,
      interpretingType: true,
      topic: true,
      schedulingDurationMin: true,
      appointmentsGroupId: true,
      channelId: true,
      status: true,
      creationDate: true,
      appointmentAdminInfo: {
        id: true,
        isInterpreterFound: true,
        isRedFlagEnabled: true,
      },
      appointmentReminder: {
        id: true,
      },
      appointmentOrder: {
        id: true,
        platformId: true,
        matchedInterpreterIds: true,
        appointment: {
          id: true,
        },
      },
      appointmentRating: {
        id: true,
      },
      interpreter: {
        id: true,
        interpreterProfile: {
          interpreterBadgePdf: true,
        },
      },
    },
  } as const satisfies FindOptionsSelect<ChimeMeetingConfiguration>,
  relations: {
    appointment: {
      appointmentReminder: true,
      appointmentAdminInfo: true,
      appointmentOrder: { appointment: true },
      appointmentRating: true,
      interpreter: {
        interpreterProfile: true,
      },
    },
    attendees: true,
  } as const satisfies FindOptionsRelations<ChimeMeetingConfiguration>,
};
export type TChimeMeetingForClosure = QueryResultType<
  ChimeMeetingConfiguration,
  typeof ChimeMeetingForClosingQuery.select
>;
