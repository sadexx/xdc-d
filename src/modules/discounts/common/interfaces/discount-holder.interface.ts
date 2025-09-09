import { Company } from "src/modules/companies/entities";
import { PromoCampaignAssignment } from "src/modules/promo-campaigns/entities";
import { UserRole } from "src/modules/users/entities";
import { MembershipAssignment } from "src/modules/memberships/entities";

export interface IDiscountHolder {
  userRole: UserRole | null;
  company: Company | null;
  promoCampaignAssignment: PromoCampaignAssignment | null;
  membershipAssignment: MembershipAssignment | null;
}
