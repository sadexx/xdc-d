import { Appointment } from "src/modules/appointments/appointment/entities";

export interface IPaymentWaitList {
  appointment: Appointment;
  paymentAttemptCount: number;
  isShortTimeSlot: boolean;
}
