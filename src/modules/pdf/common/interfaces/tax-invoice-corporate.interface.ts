export interface ITaxInvoiceCorporateReceipt {
  fromCompanyName: string;
  fromCompanyId: string;
  fromCompanyABNNumber: string;
  fromCompanyAddress: string;

  toCompanyName: string;
  toCompanyABNNumber?: string | null;
  toCompanyAddress: string;

  invoiceDate: string;
  paymentsData: ITaxInvoiceCorporateReceiptPaymentData[];
}

export interface ITaxInvoiceCorporateReceiptPaymentData {
  interpreterId: string;
  bookingId: string;
  serviceDate: string;
  description: string;
  duration: string;
  valueExclGST: string;
  valueGST: string;
  total: string;
  currency: string;
}

export interface ITaxInvoiceCorporateReceiptWithKey {
  receiptKey: string;
  receiptData: ITaxInvoiceCorporateReceipt;
}
