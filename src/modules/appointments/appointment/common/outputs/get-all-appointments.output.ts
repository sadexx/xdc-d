import { PaginationOutput } from "src/common/outputs";
import { Appointment } from "src/modules/appointments/appointment/entities";

export class GetAllAppointmentsOutput extends PaginationOutput {
  data: Appointment[];
}
