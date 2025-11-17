import { TMakeCorporatePayOuts } from "src/modules/payments/common/types/transfer";
import { IRecipientPdfData } from "src/modules/pdf/common/interfaces";

export interface ICorporatePayOutReceipt {
  recipientData: IRecipientPdfData;
  receiptNumber: string;
  issueDate: string;
  adminFirstName?: string;
  paymentsData: ICorporatePayOutReceiptPayment[];
}

export interface ICorporatePayOutReceiptPayment {
  payment: TMakeCorporatePayOuts;
  appointmentDate: string;
  appointmentServiceType: string;
  totalDuration: string;
}
