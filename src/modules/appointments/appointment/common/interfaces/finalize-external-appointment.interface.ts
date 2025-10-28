import { TCheckOutAppointment } from "src/modules/appointments/appointment/common/types";

export interface IFinalizeExternalAppointment {
  appointment: TCheckOutAppointment;
  scheduledStartTime: Date;
  scheduledEndTime: Date;
  schedulingDurationMin: number;
  alternativeStartTime: Date | null;
  alternativeEndTime: Date | null;
}
