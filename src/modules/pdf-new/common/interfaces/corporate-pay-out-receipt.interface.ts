import { TMakeCorporatePayOuts } from "src/modules/payments-new/common/types";
import { IRecipientPdfData } from "src/modules/pdf-new/common/interfaces";

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
