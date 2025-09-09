import { EMembershipPricingRegion } from "src/modules/memberships/common/enums";
import { OldECurrencies } from "src/modules/payments/common/enums";

export interface ICreateMembershipPrice {
  region: EMembershipPricingRegion;
  price: number;
  gstRate: number | null;
  currency: OldECurrencies;
  stripePriceId: string;
}
