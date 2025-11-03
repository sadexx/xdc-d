import { TMakeCorporatePayOuts } from "src/modules/payments-new/common/types";
import { ILfhCompanyPdfData, IRecipientPdfData } from "src/modules/pdf-new/common/interfaces";

export interface ICorporateTaxInvoiceReceipt {
  lfhCompanyData: ILfhCompanyPdfData;
  recipientData: IRecipientPdfData;
  issueDate: string;
  paymentsData: ICorporateTaxInvoiceReceiptPayment[];
}

export interface ICorporateTaxInvoiceReceiptPayment {
  payment: TMakeCorporatePayOuts;
  appointmentDate: string;
  appointmentServiceType: string;
  appointmentDescription: string;
  totalDuration: string;
}
