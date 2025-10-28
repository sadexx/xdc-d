import Stripe from "stripe";

export interface ICreateSubscriptionData {
  customerId: string;
  stripeClientPaymentMethodId: string;
  priceId: string;
  metadata: Stripe.Emptyable<Stripe.MetadataParam>;
  trialEnd?: number;
}
