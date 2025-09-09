import { Appointment } from "src/modules/appointments/appointment/entities";

export interface IRecreatedAppointmentWithOldAppointment {
  oldAppointment: Appointment;
  recreatedAppointment: Appointment;
}
