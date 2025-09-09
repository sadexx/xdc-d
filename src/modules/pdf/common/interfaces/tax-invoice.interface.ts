export interface ITaxInvoiceReceipt {
  fromInterpreterName: string;
  fromInterpreterId: string;
  fromInterpreterABNNumber?: string | null;
  fromInterpreterAddress: string;

  toCompanyName: string;
  toCompanyABNNumber?: string | null;
  toCompanyAddress: string;

  invoiceDate: string;
  bookingId: string;
  serviceDate: string;
  description: string;
  duration: string;
  valueExclGST: string;
  valueGST: string;
  total: string;
  currency: string;
}

export interface ITaxInvoiceReceiptWithKey {
  receiptKey: string;
  receiptData: ITaxInvoiceReceipt;
}
