import { TCheckInOutAppointment } from "src/modules/appointments/appointment/common/types";

export interface IAppointmentExternalSessionCheckInPayload {
  firstVerifyingPersonName: string;
  firstVerifyingPersonSignature: string;
  alternativeStartTime: Date | null;
  appointment: TCheckInOutAppointment;
}
