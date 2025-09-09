import { EAppointmentCommunicationType } from "src/modules/appointments/appointment/common/enums";

export interface ICreateAppointmentOutput {
  message: string;
  id?: string;
  communicationType?: EAppointmentCommunicationType;
}
