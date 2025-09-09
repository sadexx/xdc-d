import { ENotificationDataType } from "src/modules/notifications/common/enum";

export interface IAppointmentEndingMessageOutput {
  type: ENotificationDataType.APPOINTMENT_ENDING_SOON;
  appointmentId: string;
}
