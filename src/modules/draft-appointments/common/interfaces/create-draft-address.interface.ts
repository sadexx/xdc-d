import { DraftAppointment, DraftExtraDay } from "src/modules/draft-appointments/entities";

export interface ICreateDraftAddress {
  draftAppointment?: DraftAppointment;
  draftExtraDay?: DraftExtraDay;
  latitude: number;
  longitude: number;
  country: string;
  state: string;
  suburb: string;
  streetName: string;
  streetNumber: string;
  postcode: string;
  building: string | null;
  unit: string | null;
}
