import { IPaymentOperationResult } from "src/modules/payments-new/common/interfaces";

export interface IPaymentValidationResult extends IPaymentOperationResult {
  errors: string[];
}
