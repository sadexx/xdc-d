import { Payment, PaymentItem } from "src/modules/payments/entities";

export interface ICreatePaymentRecordResult {
  payment: Payment;
  paymentItem: PaymentItem;
}
