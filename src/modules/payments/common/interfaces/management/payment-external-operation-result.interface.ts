import { EPaymentStatus } from "src/modules/payments/common/enums/core";

export interface IPaymentExternalOperationResult {
  status: EPaymentStatus;
  error?: string;
  paymentIntentId?: string;
  latestCharge?: string;
  payoutId?: string;
  transferId?: string;
}
