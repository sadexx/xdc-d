import { EPaymentStatus } from "src/modules/payments-new/common/enums";

export interface IPaymentExternalOperationResult {
  status: EPaymentStatus;
  error?: string;
  paymentIntentId?: string;
  latestCharge?: string;
  payoutId?: string;
  transferId?: string;
}
