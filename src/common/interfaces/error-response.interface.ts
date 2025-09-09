import { Appointment } from "src/modules/appointments/appointment/entities";
import { EAppointmentStatus } from "src/modules/appointments/appointment/common/enums";

export interface IErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string | string[];
  conflictingAppointments?: Appointment[];
  uncompletedAppointmentStatuses?: EAppointmentStatus[];
  isPromoAssigned?: boolean;
}
