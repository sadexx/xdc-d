import { IPaymentExternalOperationResult } from "src/modules/payments/common/interfaces/management";

export interface ICaptureAllItems {
  results: IPaymentExternalOperationResult[];
  totalCapturedAmount: number;
}
