import { PromoCampaign, PromoCampaignAssignment } from "src/modules/promo-campaigns/entities";
import { Appointment } from "src/modules/appointments/appointment/entities";

/**
 ** Type
 */

export type TValidatePromoCampaignAssignmentAvailability = Pick<
  PromoCampaignAssignment,
  "lastUsedDate" | "remainingUses" | "discountMinutes"
> & {
  promoCampaign: Pick<
    PromoCampaign,
    | "status"
    | "endDate"
    | "application"
    | "communicationTypes"
    | "schedulingTypes"
    | "topics"
    | "interpreterTypes"
    | "interpretingTypes"
  >;
};

export type TValidatePromoCampaignAssignmentAvailabilityAppointment = Pick<
  Appointment,
  "communicationType" | "schedulingType" | "topic" | "interpreterType" | "interpretingType"
>;
