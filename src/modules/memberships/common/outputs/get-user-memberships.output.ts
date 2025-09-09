import { Exclude } from "class-transformer";
import { MembershipPrice } from "src/modules/memberships/entities";

export class GetUserMembershipsOutput {
  @Exclude()
  membershipPrices: MembershipPrice[];
}
