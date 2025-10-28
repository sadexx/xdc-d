import { Appointment } from "src/modules/appointments/appointment/entities";

export type TMakePayInAuthByAdditionalBlockAppointment = Pick<
  Appointment,
  | "id"
  | "schedulingDurationMin"
  | "clientId"
  | "interpreterId"
  | "acceptOvertimeRates"
  | "interpreterType"
  | "schedulingType"
  | "communicationType"
  | "interpretingType"
  | "topic"
  | "alternativePlatform"
>;
