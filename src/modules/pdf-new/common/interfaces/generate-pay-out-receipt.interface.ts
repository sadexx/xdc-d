import { TGeneratePayOutReceiptAppointment, TGeneratePayOutReceiptInterpreter } from "src/modules/pdf-new/common/types";
import { ICreatePaymentRecordResult } from "src/modules/payments-new/common/interfaces";

export interface IGeneratePayOutReceipt {
  paymentRecordResult: ICreatePaymentRecordResult;
  appointment: TGeneratePayOutReceiptAppointment;
  interpreter: TGeneratePayOutReceiptInterpreter;
}
