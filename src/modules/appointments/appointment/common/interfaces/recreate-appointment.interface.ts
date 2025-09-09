import {
  EAppointmentCommunicationType,
  EAppointmentInterpreterType,
  EAppointmentInterpretingType,
  EAppointmentParticipantType,
  EAppointmentSchedulingType,
  EAppointmentSimultaneousInterpretingType,
  EAppointmentTopic,
} from "src/modules/appointments/appointment/common/enums";
import { ELanguages } from "src/modules/interpreters/profile/common/enum";
import { EUserGender } from "src/modules/users/common/enums";
import { AppointmentReminder } from "src/modules/appointments/appointment/entities";

export interface IRecreateAppointment {
  client: { id: string };
  scheduledStartTime: Date;
  scheduledEndTime: Date;
  communicationType: EAppointmentCommunicationType;
  schedulingType: EAppointmentSchedulingType;
  schedulingDurationMin: number;
  topic: EAppointmentTopic;
  preferredInterpreterGender: EUserGender | null;
  interpreterType: EAppointmentInterpreterType;
  interpretingType: EAppointmentInterpretingType;
  simultaneousInterpretingType: EAppointmentSimultaneousInterpretingType | null;
  languageFrom: ELanguages;
  languageTo: ELanguages;
  participantType: EAppointmentParticipantType;
  alternativePlatform: boolean;
  alternativeVideoConferencingPlatformLink: string | null;
  notes: string | null;
  schedulingExtraDay: boolean;
  isGroupAppointment: boolean;
  appointmentsGroupId: string | null;
  sameInterpreter: boolean;
  operatedByCompanyName: string;
  operatedByCompanyId: string;
  operatedByMainCorporateCompanyName: string | null;
  operatedByMainCorporateCompanyId: string | null;
  acceptOvertimeRates: boolean;
  timezone: string;
  internalEstimatedEndTime: Date;
  appointmentReminder: AppointmentReminder;
}
