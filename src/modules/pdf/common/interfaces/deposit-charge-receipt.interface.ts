export interface IDepositChargeReceipt {
  fromCompanyName: string;
  fromCompanyABNNumber: string;
  fromCompanyAddress: string;
  toCompanyName: string;
  toCompanyABNNumber?: string | null;
  toCompanyId: string;
  toCompanyAddress: string;

  receiptNumber: string;

  currency: string;
  issueDate: string;
  total: number;
  gstAmount: number;
  invoiceTotal: number;
  amountPaid: number;
  amountDue: string;

  paymentDate: string;
  paymentDescription: string;
  paymentTotal: number;
  thisInvoiceAmount: number;

  transactionId: string;
  service: string;
  paymentDateTime: string;
}

export interface IDepositChargeReceiptWithKey {
  receiptKey: string;
  receiptData: IDepositChargeReceipt;
}
