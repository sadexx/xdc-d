import { EPaymentOperation } from "src/modules/payment-analysis/common/enums";
import { IAuthorizationPaymentContext } from "src/modules/payment-analysis/common/interfaces/authorization";
import { EPaymentAuthorizationStrategy } from "src/modules/payment-analysis/common/enums/authorization";
import { IPaymentValidationResult } from "src/modules/payments-new/common/interfaces";
import { EPaymentCaptureStrategy } from "src/modules/payment-analysis/common/enums/capture";
import { ICapturePaymentContext } from "src/modules/payment-analysis/common/interfaces/capture";

export type TProcessPaymentOperationData = IProcessAuthorizationData | IProcessCaptureData;

interface IProcessAuthorizationData {
  operation: EPaymentOperation.AUTHORIZE_PAYMENT;
  strategy: EPaymentAuthorizationStrategy;
  context: IAuthorizationPaymentContext;
  validationResult: IPaymentValidationResult;
}

interface IProcessCaptureData {
  operation: EPaymentOperation.CAPTURE_PAYMENT;
  strategy: EPaymentCaptureStrategy;
  context: ICapturePaymentContext;
  validationResult: IPaymentValidationResult;
}
