export interface IAppointmentExternalSessionCheckOutPayload {
  secondVerifyingPersonName: string;
  secondVerifyingPersonSignature: string;
  alternativeEndTime: Date | null;
}
