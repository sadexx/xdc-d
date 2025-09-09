export interface IFinalizeExternalAppointment {
  appointmentId: string;
  scheduledStartTime: Date;
  scheduledEndTime: Date;
  schedulingDurationMin: number;
  alternativeStartTime: Date | null;
  alternativeEndTime: Date | null;
}
