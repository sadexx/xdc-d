import { Payment, PaymentItem } from "src/modules/payments-new/entities";

export interface ICreatePaymentRecordResult {
  payment: Payment;
  paymentItem: PaymentItem;
}
