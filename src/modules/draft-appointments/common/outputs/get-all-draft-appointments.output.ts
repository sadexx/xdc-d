import { PaginationOutput } from "src/common/outputs";
import { DraftAppointment } from "src/modules/draft-appointments/entities";

export class GetAllDraftAppointmentsOutput extends PaginationOutput {
  data: DraftAppointment[];
}
