import { TLoadPaymentTransferContext } from "src/modules/payments-analysis/common/types/transfer";

export interface IPaymentTransferContext {
  incomingPayment: TLoadPaymentTransferContext;
  outcomingPayment: TLoadPaymentTransferContext | null;
}
