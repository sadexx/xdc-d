import { DraftAppointment } from "src/modules/draft-appointments/entities";

export interface ICreateDraftExtraDay {
  draftAppointment: DraftAppointment;
  scheduledStartTime: Date;
  schedulingDurationMin: number;
  sameAddress: boolean | null;
  notes: string | null;
}
