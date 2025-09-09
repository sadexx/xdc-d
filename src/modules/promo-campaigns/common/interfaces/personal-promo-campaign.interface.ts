import { PromoCampaignBanner } from "src/modules/promo-campaigns/entities";
import { TPersonalPromoCampaignDtoTarget } from "src/modules/promo-campaigns/common/types";

export interface IPersonalPromoCampaign {
  target: TPersonalPromoCampaignDtoTarget;
  banner: PromoCampaignBanner | null;
  partnerName: string | null;
}
