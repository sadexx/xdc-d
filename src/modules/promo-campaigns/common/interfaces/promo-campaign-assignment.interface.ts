import { TCreateOrUpdatePromoCampaignAssignment } from "src/modules/promo-campaigns/common/types";

export interface IPromoCampaignAssignment {
  discount: number;
  discountMinutes: number | null;
  remainingUses: number | null;
  promoCampaign: TCreateOrUpdatePromoCampaignAssignment;
}
