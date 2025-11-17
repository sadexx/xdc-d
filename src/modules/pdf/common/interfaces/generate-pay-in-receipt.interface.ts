import { TGeneratePayInReceiptPayment, TGeneratePayInReceiptAppointment } from "src/modules/pdf/common/types";
import { IPaymentCalculationResult } from "src/modules/payments/common/interfaces/pricing";

export interface IGeneratePayInReceipt {
  payment: TGeneratePayInReceiptPayment;
  appointment: TGeneratePayInReceiptAppointment;
  prices: IPaymentCalculationResult;
}
