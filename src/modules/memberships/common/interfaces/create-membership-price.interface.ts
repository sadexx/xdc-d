import { EMembershipPricingRegion } from "src/modules/memberships/common/enums";
import { EPaymentCurrency } from "src/modules/payments/common/enums/core";

export interface ICreateMembershipPrice {
  region: EMembershipPricingRegion;
  price: string;
  gstRate: string | null;
  currency: EPaymentCurrency;
  stripePriceId: string;
}
