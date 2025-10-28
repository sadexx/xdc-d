import { TLoadPaymentTransferContext } from "src/modules/payment-analysis/common/types/transfer";

export interface IPaymentTransferContext {
  incomingPayment: TLoadPaymentTransferContext;
  outcomingPayment: TLoadPaymentTransferContext;
}
