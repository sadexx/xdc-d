import { IPaymentCalculationResult } from "src/modules/payments-new/common/interfaces";
import { TGeneratePayInReceiptPayment, TGeneratePayInReceiptAppointment } from "src/modules/pdf-new/common/types";

export interface IGeneratePayInReceipt {
  payment: TGeneratePayInReceiptPayment;
  appointment: TGeneratePayInReceiptAppointment;
  prices: IPaymentCalculationResult;
}
