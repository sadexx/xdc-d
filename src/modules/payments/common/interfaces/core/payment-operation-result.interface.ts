import { ICreatePaymentRecordResult } from "src/modules/payments/common/interfaces/management";

export interface IPaymentOperationResult {
  success: boolean;
  paymentRecordResult?: ICreatePaymentRecordResult;
}
