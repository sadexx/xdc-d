import { QueryResultType } from "src/common/types";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { FindOptionsRelations, FindOptionsSelect } from "typeorm";

export const AppointmentsWithoutClientVisitQuery = {
  select: {
    id: true,
    scheduledStartTime: true,
    scheduledEndTime: true,
    clientId: true,
    interpreterId: true,
    appointmentsGroupId: true,
    channelId: true,
    platformId: true,
    chimeMeetingConfiguration: {
      id: true,
    },
    appointmentReminder: {
      id: true,
    },
    interpreter: {
      id: true,
      interpreterProfile: {
        interpreterBadgePdf: true,
      },
    },
  } as const satisfies FindOptionsSelect<Appointment>,
  relations: {
    chimeMeetingConfiguration: true,
    interpreter: {
      interpreterProfile: true,
    },
  } as const satisfies FindOptionsRelations<Appointment>,
};
export type TAppointmentsWithoutClientVisit = QueryResultType<
  Appointment,
  typeof AppointmentsWithoutClientVisitQuery.select
>;
