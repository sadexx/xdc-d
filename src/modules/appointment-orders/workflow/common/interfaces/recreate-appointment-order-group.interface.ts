import {
  EAppointmentCommunicationType,
  EAppointmentInterpreterType,
  EAppointmentInterpretingType,
  EAppointmentParticipantType,
  EAppointmentSchedulingType,
  EAppointmentTopic,
} from "src/modules/appointments/appointment/common/enums";
import { EUserGender, EUserRoleName } from "src/modules/users/common/enums";
import { ELanguages } from "src/modules/interpreters/profile/common/enum";

export interface IRecreateAppointmentOrderGroup {
  id: string;
  appointmentsGroupId: string | null;
  sameInterpreter: boolean;
  acceptOvertimeRates: boolean;
  platformId: string;
  scheduledStartTime: Date;
  scheduledEndTime: Date;
  communicationType: EAppointmentCommunicationType;
  schedulingType: EAppointmentSchedulingType;
  schedulingDurationMin: number;
  topic: EAppointmentTopic;
  preferredInterpreterGender: EUserGender | null;
  interpreterType: EAppointmentInterpreterType;
  interpretingType: EAppointmentInterpretingType;
  languageFrom: ELanguages;
  languageTo: ELanguages;
  participantType: EAppointmentParticipantType;
  timezone: string;
  client: {
    id: string;
    operatedByCompanyName: string;
    operatedByCompanyId: string;
    operatedByMainCorporateCompanyName: string | null;
    operatedByMainCorporateCompanyId: string | null;
    timezone: string | null;
    role: {
      id: string;
      name: EUserRoleName;
    };
    user: {
      id: string;
      platformId: string;
    };
    profile: {
      id: string;
      firstName: string;
      lastName: string;
    };
  };
  address: {
    id: string;
    latitude: number;
    longitude: number;
    country: string;
    state: string;
    suburb: string;
    streetName: string | null;
    streetNumber: string | null;
    postcode: string | null;
    building: string | null;
    unit: string | null;
    timezone: string;
  };
  appointmentOrder: {
    id: string;
    appointmentOrderGroup: {
      id: string;
      appointmentOrders: {
        id: string;
      }[];
    };
  };
}
