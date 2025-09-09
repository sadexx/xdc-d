import { Expose, Type } from "class-transformer";
import { PromoCampaignAssignment } from "src/modules/promo-campaigns/entities";
import { MembershipAssignment } from "src/modules/memberships/entities";

export class DiscountHolderOutput {
  @Expose()
  @Type(() => PromoCampaignAssignment)
  promoCampaignAssignment: PromoCampaignAssignment;

  @Expose()
  @Type(() => MembershipAssignment)
  membershipAssignment: MembershipAssignment;
}
