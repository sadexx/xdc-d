import { QueryResultType } from "src/common/types";
import { FindOptionsRelations, FindOptionsSelect } from "typeorm";
import { AppointmentOrder } from "src/modules/appointment-orders/appointment-order/entities";
import { Appointment, AppointmentAdminInfo, AppointmentRating } from "src/modules/appointments/appointment/entities";

/**
 ** Type
 */

export type TFinalizeVirtualAppointment = Pick<
  Appointment,
  | "id"
  | "scheduledStartTime"
  | "schedulingDurationMin"
  | "businessStartTime"
  | "businessEndTime"
  | "schedulingType"
  | "interpreterId"
> & {
  appointmentRating: Pick<AppointmentRating, "id"> | null;
  appointmentAdminInfo: Pick<AppointmentAdminInfo, "id" | "isRedFlagEnabled"> | null;
  appointmentOrder:
    | (Pick<AppointmentOrder, "id" | "platformId" | "matchedInterpreterIds"> & { appointment: Pick<Appointment, "id"> })
    | null;
};

/**
 ** Query types
 */

export const ConfirmExternalInterpreterFoundQuery = {
  select: {
    id: true,
    schedulingDurationMin: true,
    communicationType: true,
    appointmentAdminInfo: { id: true },
  } as const satisfies FindOptionsSelect<Appointment>,
  relations: { appointmentAdminInfo: true } as const satisfies FindOptionsRelations<Appointment>,
};
export type TConfirmExternalInterpreterFound = QueryResultType<
  Appointment,
  typeof ConfirmExternalInterpreterFoundQuery.select
>;
