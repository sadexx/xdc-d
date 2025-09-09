import { EMembershipType } from "src/modules/memberships/common/enums";

export interface IMembershipDiscountData {
  discount: number;
  freeMinutes: number | null;
  membershipType: EMembershipType;
}
