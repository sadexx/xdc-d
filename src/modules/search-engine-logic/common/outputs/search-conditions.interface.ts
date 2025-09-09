import { EAppointmentTopic } from "src/modules/appointments/appointment/common/enums";

export interface ISearchConditionsOutput {
  appointmentId: string;
  topic?: EAppointmentTopic;
  preferredInterpreterGender?: string;
}
