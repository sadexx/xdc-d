import { Appointment } from "src/modules/appointments/appointment/entities";

export type TCalculateAppointmentPriceAppointment = Pick<
  Appointment,
  | "id"
  | "schedulingDurationMin"
  | "interpreterId"
  | "acceptOvertimeRates"
  | "interpreterType"
  | "schedulingType"
  | "communicationType"
  | "interpretingType"
  | "topic"
  | "alternativePlatform"
>;
