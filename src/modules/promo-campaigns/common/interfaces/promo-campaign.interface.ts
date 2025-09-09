import {
  EAppointmentCommunicationType,
  EAppointmentSchedulingType,
  EAppointmentTopic,
  EAppointmentInterpreterType,
  EAppointmentInterpretingType,
} from "src/modules/appointments/appointment/common/enums";
import {
  EPromoCampaignTarget,
  EPromoCampaignDuration,
  EPromoCampaignApplication,
  EPromoCampaignStatus,
} from "src/modules/promo-campaigns/common/enums";
import { IPromoCampaignBanner } from "src/modules/promo-campaigns/common/types";

export interface IPromoCampaign {
  name: string;
  promoCode: string;
  discount: number;
  startDate: Date;
  target: EPromoCampaignTarget;
  duration: EPromoCampaignDuration;
  application: EPromoCampaignApplication;
  communicationTypes: EAppointmentCommunicationType[];
  schedulingTypes: EAppointmentSchedulingType[];
  topics: EAppointmentTopic[];
  interpreterTypes: EAppointmentInterpreterType[];
  interpretingTypes: EAppointmentInterpretingType[];
  banner: IPromoCampaignBanner | null;
  discountMinutes: number | null;
  endDate: Date | null;
  usageLimit: number | null;
  partnerName: string | null;
  status: EPromoCampaignStatus;
  bannerDisplay: boolean;
  conditionsUrl: string | null;
}
