import { Appointment } from "src/modules/appointments/appointment/entities";
import { EExtCountry } from "src/modules/addresses/common/enums";

export interface ICreateFaceToFaceAppointmentAddress {
  appointment: Appointment;
  latitude: number;
  longitude: number;
  country: EExtCountry;
  state: string;
  suburb: string;
  streetName: string;
  streetNumber: string;
  postcode: string;
  building?: string;
  unit?: string;
  timezone: string;
}
