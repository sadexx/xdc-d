import { ICapturePaymentContext } from "src/modules/payments-analysis/common/interfaces/capture";
import { EPaymentCaptureStrategy } from "src/modules/payments-analysis/common/enums/capture";
import { IPaymentValidationResult } from "src/modules/payments/common/interfaces/payment-failed";

export interface IMakeCaptureAndTransfer {
  strategy: EPaymentCaptureStrategy;
  context: ICapturePaymentContext;
  validationResult: IPaymentValidationResult;
}
