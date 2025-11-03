import { ICapturePaymentContext } from "src/modules/payment-analysis/common/interfaces/capture";
import { IPaymentValidationResult } from "src/modules/payments-new/common/interfaces";
import { EPaymentCaptureStrategy } from "src/modules/payment-analysis/common/enums/capture";

export interface IMakeCaptureAndTransfer {
  strategy: EPaymentCaptureStrategy;
  context: ICapturePaymentContext;
  validationResult: IPaymentValidationResult;
}
