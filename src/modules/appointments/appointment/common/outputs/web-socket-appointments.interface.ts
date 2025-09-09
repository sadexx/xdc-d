import { Appointment } from "src/modules/appointments/appointment/entities";

export interface IWebSocketAppointmentsOutput {
  newAppointments: Appointment[];
  newAppointmentGroups: Appointment[];
  newRedFlagAppointments: Appointment[];
  newRedFlagAppointmentGroups: Appointment[];
}
