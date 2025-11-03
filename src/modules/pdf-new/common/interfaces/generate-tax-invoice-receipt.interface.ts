import {
  TGenerateTaxInvoiceReceiptAppointment,
  TGenerateTaxInvoiceReceiptInterpreter,
} from "src/modules/pdf-new/common/types";
import { ICreatePaymentRecordResult } from "src/modules/payments-new/common/interfaces";

export interface IGenerateTaxInvoiceReceipt {
  paymentRecordResult: ICreatePaymentRecordResult;
  appointment: TGenerateTaxInvoiceReceiptAppointment;
  interpreter: TGenerateTaxInvoiceReceiptInterpreter;
}
