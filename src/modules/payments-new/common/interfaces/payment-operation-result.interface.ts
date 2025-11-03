import { ICreatePaymentRecordResult } from "src/modules/payments-new/common/interfaces";

export interface IPaymentOperationResult {
  success: boolean;
  paymentRecordResult?: ICreatePaymentRecordResult;
}
