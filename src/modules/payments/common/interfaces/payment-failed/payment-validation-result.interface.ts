import { IPaymentOperationResult } from "src/modules/payments/common/interfaces/core";

export interface IPaymentValidationResult extends IPaymentOperationResult {
  errors: string[];
}
