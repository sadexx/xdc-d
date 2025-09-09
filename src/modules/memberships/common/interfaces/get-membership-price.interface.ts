import { OldECurrencies } from "src/modules/payments/common/enums";

export interface IGetMembershipPrice {
  price: number;
  gstAmount: number | null;
  currency: OldECurrencies;
  stripePriceId: string;
}
