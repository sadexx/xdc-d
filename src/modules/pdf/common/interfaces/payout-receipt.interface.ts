export interface IPayOutReceipt {
  receiptNumber: string;
  issueDate: string;
  userName: string;
  interpreterId: string;
  firstName: string;
  currency: string;
  fullAmountWithoutCurrency: string;
  amount: string;
  gstAmount: string;
  fullAmount: string;
  paymentDate: string;
  bookingId: string;
  service: string;
  topic: string;
  duration: string;
  serviceDate: string;
}

export interface IPayOutReceiptWithKey {
  receiptKey: string;
  receiptData: IPayOutReceipt;
}
