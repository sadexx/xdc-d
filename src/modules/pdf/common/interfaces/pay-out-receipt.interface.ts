import { IRecipientPdfData } from "src/modules/pdf/common/interfaces";
import { TGeneratePayOutReceiptAppointment, TGeneratePayOutReceiptInterpreter } from "src/modules/pdf/common/types";
import { Payment } from "src/modules/payments/entities";

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
