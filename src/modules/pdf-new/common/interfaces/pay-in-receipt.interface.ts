import { ILfhCompanyPdfData, IRecipientPdfData } from "src/modules/pdf-new/common/interfaces";
import { IDiscountRate } from "src/modules/discounts/common/interfaces";
import { DiscountSummary } from "src/modules/rates/common/interfaces";
import { TGeneratePayInReceiptAppointment, TGeneratePayInReceiptPayment } from "src/modules/pdf-new/common/types";

export interface IPayInReceipt {
  lfhCompanyData: ILfhCompanyPdfData;
  recipientData: IRecipientPdfData;
  appointment: TGeneratePayInReceiptAppointment;
  payment: TGeneratePayInReceiptPayment;
  discountSummary: IPayInReceiptDiscountsSummary | null;
  issueDate: string;
  appointmentServiceType: string;
  appointmentDate: string;
  interpreter: string;
  totalDuration: string;
}

export interface IPayInReceiptDiscountsSummary {
  mixedPromoCodeDescription: string | null;
  promoCodeDiscountDescription: string | null;
  membershipDescription: string | null;
  membershipDiscountDescription: string | null;
  discountRate: IDiscountRate;
  appliedDiscounts: DiscountSummary;
}
