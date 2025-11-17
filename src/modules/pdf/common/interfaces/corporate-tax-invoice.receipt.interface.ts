import { TMakeCorporatePayOuts } from "src/modules/payments/common/types/transfer";
import { ILfhCompanyPdfData, IRecipientPdfData } from "src/modules/pdf/common/interfaces";

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
