import { ILfhCompanyPdfData, IRecipientPdfData } from "src/modules/pdf/common/interfaces";
import { TGenerateCorporatePostPaymentReceipt } from "src/modules/admin/common/types";

export interface ICorporatePostPaymentReceipt {
  lfhCompanyData: ILfhCompanyPdfData;
  recipientData: IRecipientPdfData;
  issueDate: string;
  paymentsData: ICorporatePostPaymentReceiptPayment[];
}

export interface ICorporatePostPaymentReceiptPayment {
  payment: TGenerateCorporatePostPaymentReceipt;
  appointmentDate: string;
  appointmentServiceType: string;
  appointmentDescription: string;
  totalDuration: string;
}
