import { EPaymentCurrency } from "src/modules/payments/common/enums/core";

export interface IGetMembershipPrice {
  price: number;
  gstAmount: number | null;
  currency: EPaymentCurrency;
  stripePriceId: string;
}
