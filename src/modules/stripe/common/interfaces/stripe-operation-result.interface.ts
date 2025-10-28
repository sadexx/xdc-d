import { EPaymentStatus } from "src/modules/payments-new/common/enums";

export interface IStripeOperationResult {
  status: EPaymentStatus;
  error?: string;
  paymentIntentId?: string;
  latestCharge?: string;
}
