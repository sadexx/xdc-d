import { Appointment } from "src/modules/appointments/appointment/entities";

export interface ICreateMultiWayParticipant {
  appointment: Appointment;
  name: string;
  age?: number;
  phoneCode: string;
  phoneNumber: string;
  email?: string;
}
