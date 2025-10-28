import { Appointment } from "src/modules/appointments/appointment/entities";
import { EAppointmentStatus } from "src/modules/appointments/appointment/common/enums";
import { IErrorMessageVariables } from "src/common/interfaces/error-message-variables.interface";

export interface IErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string | string[];
  isPromoAssigned?: boolean;
  conflictingAppointments?: Appointment[];
  uncompletedAppointmentStatuses?: EAppointmentStatus[];
  variables?: IErrorMessageVariables;
}
