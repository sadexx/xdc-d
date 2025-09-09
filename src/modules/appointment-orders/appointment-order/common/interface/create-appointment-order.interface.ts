import { Address } from "src/modules/addresses/entities";
import { AppointmentOrderGroup } from "src/modules/appointment-orders/appointment-order/entities";
import {
  EAppointmentCommunicationType,
  EAppointmentInterpreterType,
  EAppointmentInterpretingType,
  EAppointmentParticipantType,
  EAppointmentSchedulingType,
  EAppointmentTopic,
} from "src/modules/appointments/appointment/common/enums";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { ELanguages } from "src/modules/interpreters/profile/common/enum";
import { ERepeatInterval } from "src/modules/appointment-orders/appointment-order/common/enum";
import { EUserGender } from "src/modules/users/common/enums";

export interface ICreateAppointmentOrder {
  appointment: Appointment;
  platformId: string;
  appointmentOrderGroup?: AppointmentOrderGroup;
  isOrderGroup?: boolean;
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
  clientPlatformId: string;
  clientFirstName: string;
  clientPreferredName?: string | null;
  clientLastName: string;
  participantType: EAppointmentParticipantType;
  nextRepeatTime: Date | null;
  repeatInterval: ERepeatInterval | null;
  remainingRepeats: number | null;
  notifyAdmin: Date | null;
  endSearchTime: Date | null;
  operatedByCompanyName: string;
  operatedByCompanyId: string;
  operatedByMainCorporateCompanyName: string | null;
  operatedByMainCorporateCompanyId: string | null;
  timeToRestart: null;
  isFirstSearchCompleted: boolean | null;
  isSecondSearchCompleted: boolean | null;
  isSearchNeeded: boolean | null;
  isCompanyHasInterpreters: boolean | null;
  acceptOvertimeRates: boolean | null;
  timezone: string | null;
  address?: Address | null;
}
