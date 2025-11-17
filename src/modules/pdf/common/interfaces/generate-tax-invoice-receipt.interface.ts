import {
  TGenerateTaxInvoiceReceiptAppointment,
  TGenerateTaxInvoiceReceiptInterpreter,
} from "src/modules/pdf/common/types";
import { ICreatePaymentRecordResult } from "src/modules/payments/common/interfaces/management";

export interface IGenerateTaxInvoiceReceipt {
  paymentRecordResult: ICreatePaymentRecordResult;
  appointment: TGenerateTaxInvoiceReceiptAppointment;
  interpreter: TGenerateTaxInvoiceReceiptInterpreter;
}
