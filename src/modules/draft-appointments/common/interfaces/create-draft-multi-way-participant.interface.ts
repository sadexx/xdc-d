import { DraftAppointment } from "src/modules/draft-appointments/entities";

export interface ICreateDraftMultiWayParticipant {
  draftAppointment: DraftAppointment;
  name: string;
  age: number | null;
  phoneCode: string;
  phoneNumber: string;
  email: string | null;
}
