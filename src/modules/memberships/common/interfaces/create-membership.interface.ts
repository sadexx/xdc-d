import { EMembershipStatus, EMembershipType } from "src/modules/memberships/common/enums";
import { ICreateMembershipPrice } from "src/modules/memberships/common/interfaces";

export interface ICreateMembership {
  type: EMembershipType;
  status: EMembershipStatus;
  discount: number;
  onDemandMinutes: number;
  preBookedMinutes: number;
  isMostPopular: boolean;
  membershipPrices: ICreateMembershipPrice[];
}
