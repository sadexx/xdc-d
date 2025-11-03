import { IRecipientPdfData } from "src/modules/pdf-new/common/interfaces";
import { TGeneratePayOutReceiptAppointment, TGeneratePayOutReceiptInterpreter } from "src/modules/pdf-new/common/types";
import { Payment } from "src/modules/payments-new/entities";

export interface IPayOutReceipt {
  recipientData: IRecipientPdfData;
  appointmentServiceType: string;
  issueDate: string;
  totalDuration: string;
  appointmentDate: string;
  payment: Payment;
  appointment: TGeneratePayOutReceiptAppointment;
  interpreter: TGeneratePayOutReceiptInterpreter;
}
