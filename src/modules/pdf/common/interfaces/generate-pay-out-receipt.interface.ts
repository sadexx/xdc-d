import { TGeneratePayOutReceiptAppointment, TGeneratePayOutReceiptInterpreter } from "src/modules/pdf/common/types";
import { ICreatePaymentRecordResult } from "src/modules/payments/common/interfaces/management";

export interface IGeneratePayOutReceipt {
  paymentRecordResult: ICreatePaymentRecordResult;
  appointment: TGeneratePayOutReceiptAppointment;
  interpreter: TGeneratePayOutReceiptInterpreter;
}
