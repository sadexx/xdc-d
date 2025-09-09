import { QueryResultType } from "src/common/types";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { FindOptionsRelations, FindOptionsSelect } from "typeorm";
import { MultiWayParticipant } from "src/modules/multi-way-participant/entities";

export const AddParticipantToAppointmentQuery = {
  select: {
    id: true,
    platformId: true,
    scheduledStartTime: true,
    schedulingDurationMin: true,
    topic: true,
    participantType: true,
    alternativePlatform: true,
    alternativeVideoConferencingPlatformLink: true,
    languageFrom: true,
    languageTo: true,
    client: {
      id: true,
      profile: {
        firstName: true,
        lastName: true,
        preferredName: true,
      },
    },
    chimeMeetingConfiguration: {
      id: true,
      appointmentId: true,
      maxAttendees: true,
      appointment: {
        id: true,
        communicationType: true,
      },
    },
  } as const satisfies FindOptionsSelect<Appointment>,
  relations: {
    client: { profile: true },
    chimeMeetingConfiguration: { appointment: true },
  } as const satisfies FindOptionsRelations<Appointment>,
};
export type TAddParticipantToAppointment = QueryResultType<Appointment, typeof AddParticipantToAppointmentQuery.select>;

type TAddParticipantToAppointmentWithChimeMeeting = TAddParticipantToAppointment & {
  chimeMeetingConfiguration: NonNullable<TAddParticipantToAppointment["chimeMeetingConfiguration"]>;
};
export type TChimeMeetingConfigForParticipant =
  TAddParticipantToAppointmentWithChimeMeeting["chimeMeetingConfiguration"];

export const UpdateParticipantQuery = {
  select: {
    id: true,
    email: true,
    phoneCode: true,
    phoneNumber: true,
    appointment: {
      id: true,
      platformId: true,
      scheduledStartTime: true,
      schedulingDurationMin: true,
      topic: true,
      participantType: true,
      alternativePlatform: true,
      alternativeVideoConferencingPlatformLink: true,
      languageFrom: true,
      languageTo: true,
      client: {
        id: true,
        profile: {
          firstName: true,
          lastName: true,
          preferredName: true,
        },
      },
    },
  } as const satisfies FindOptionsSelect<MultiWayParticipant>,
  relations: {
    appointment: { client: { profile: true } },
  } as const satisfies FindOptionsRelations<MultiWayParticipant>,
};
export type TUpdateParticipant = QueryResultType<MultiWayParticipant, typeof UpdateParticipantQuery.select>;

export const DeleteParticipantQuery = {
  select: {
    id: true,
    appointment: {
      id: true,
      chimeMeetingConfiguration: {
        id: true,
        maxAttendees: true,
      },
      participants: {
        id: true,
      },
    },
  } as const satisfies FindOptionsSelect<MultiWayParticipant>,
  relations: {
    appointment: {
      chimeMeetingConfiguration: true,
      participants: true,
    },
  } as const satisfies FindOptionsRelations<MultiWayParticipant>,
};
export type TDeleteParticipant = QueryResultType<MultiWayParticipant, typeof DeleteParticipantQuery.select>;
