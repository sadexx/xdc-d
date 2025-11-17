import {
  EAppointmentCommunicationType,
  EAppointmentInterpreterType,
  EAppointmentSchedulingType,
  EAppointmentStatus,
  EAppointmentTopic,
} from "src/modules/appointments/appointment/common/enums";
import { EUserRoleName } from "src/modules/users/common/enums";
import { ELanguages } from "src/modules/interpreters/profile/common/enum";
import { EMembershipType } from "src/modules/memberships/common/enums";
import { EPaymentCurrency } from "src/modules/payments/common/enums/core";

export interface IAppointmentsCsv {
  platformId: string;
  status: EAppointmentStatus;
  interpreterType: EAppointmentInterpreterType;
  schedulingType: EAppointmentSchedulingType;
  communicationType: EAppointmentCommunicationType;
  scheduledStartTime: Date;
  scheduledEndTime: Date;
  schedulingDurationMin: number;
  interpreterFullName: string | null;
  interpreterRole: EUserRoleName | null;
  clientFullName: string;
  languageFrom: ELanguages;
  languageTo: ELanguages;
  topic: EAppointmentTopic;
  creationDate: Date;
  paidByClient: string | null;
  clientCurrency: EPaymentCurrency | null;
  receivedByInterpreter: string | null;
  interpreterCurrency: EPaymentCurrency | null;
  appointmentCallRating: number | null;
  interpreterRating: number | null;
  promoCampaignDiscount: number | null;
  membershipDiscount: number | null;
  promoCampaignDiscountMinutes: number | null;
  membershipFreeMinutes: number | null;
  promoCode: string | null;
  membershipType: EMembershipType | null;
  notes: string | null;
}
