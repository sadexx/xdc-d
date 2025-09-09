import { EPromoCampaignTarget } from "src/modules/promo-campaigns/common/enums";

export interface ICorporatePromoCampaign {
  target: typeof EPromoCampaignTarget.CORPORATE_COMPANY;
  banner: null;
  partnerName: null;
}
