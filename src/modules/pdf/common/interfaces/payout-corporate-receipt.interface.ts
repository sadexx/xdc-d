export interface IPayOutCorporateReceipt {
  receiptNumber: string;
  issueDate: string;
  companyName: string;
  companyAbnNumber?: string | null;
  companyId: string;
  adminFirstName: string;
  paymentsData: IPayOutCorporateReceiptPaymentData[];
}

export interface IPayOutCorporateReceiptPaymentData {
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
  interpreterId: string;
}

export interface IPayOutCorporateReceiptWithKey {
  receiptKey: string;
  receiptData: IPayOutCorporateReceipt;
}
