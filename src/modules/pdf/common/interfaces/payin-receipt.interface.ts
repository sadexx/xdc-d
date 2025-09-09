export interface IPayInReceipt {
  fromCompanyName: string;
  fromCompanyABNNumber: string;
  fromCompanyAddress: string;
  toUserName: string;
  toClientId: string;
  toAddress: string;

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

  bookingId: string;
  service: string;
  topic: string;
  appointmentDate: string;
  interpreterId: string;
  duration: string;

  estimatedCostAmount: number;
  actualTimeAmount: number;
  promoCodeName: string | null;
  promoCodeDiscount: string | null;
  promoCodeDiscountAmount: number;
  mixedPromoCodeName: string | null;
  mixedPromoCodeDescription: string | null;
  mixedPromoCodeDiscountAmount: number;
  membershipDescription: string | null;
  membershipDiscount: string | null;
  membershipDiscountAmount: number;
  subTotalAmount: number;
  totalAmount: number;
}

export interface IPayInDiscounts {
  estimatedCostAmount: number;
  actualTimeAmount: number;
  promoCodeName: string | null;
  promoCodeDiscount: string | null;
  promoCodeDiscountAmount: number;
  mixedPromoCodeName: string | null;
  mixedPromoCodeDescription: string | null;
  mixedPromoCodeDiscountAmount: number;
  membershipDescription: string | null;
  membershipDiscount: string | null;
  membershipDiscountAmount: number;
}

export interface IPayInReceiptWithKey {
  receiptKey: string;
  receiptData: IPayInReceipt;
}
