import { TGenerateTaxInvoiceReceiptAppointment } from "src/modules/pdf/common/types";
import { ILfhCompanyPdfData, IRecipientPdfData } from "src/modules/pdf/common/interfaces";
import { Payment } from "src/modules/payments/entities";

export interface ITaxInvoiceReceipt {
  lfhCompanyData: ILfhCompanyPdfData;
  recipientData: IRecipientPdfData;
  issueDate: string;
  appointmentDescription: string;
  totalDuration: string;
  appointmentDate: string;
  payment: Payment;
  appointment: TGenerateTaxInvoiceReceiptAppointment;
}
