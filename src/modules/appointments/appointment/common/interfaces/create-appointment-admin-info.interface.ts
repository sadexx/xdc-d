import { Appointment } from "src/modules/appointments/appointment/entities";

export interface ICreateAppointmentAdminInfo {
  appointment: Appointment;
  completedMeetingDuration: number;
  clientFirstName: string;
  clientPreferredName?: string | null;
  clientLastName: string;
  clientPhone: string;
  clientEmail: string;
  clientDateOfBirth: string;
  isRedFlagEnabled: boolean;
}
