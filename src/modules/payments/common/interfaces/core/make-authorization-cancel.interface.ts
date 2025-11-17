import { EPaymentAuthorizationCancelStrategy } from "src/modules/payments-analysis/common/enums/authorization-cancel";
import { IAuthorizationCancelPaymentContext } from "src/modules/payments-analysis/common/interfaces/authorization-cancel";
import { IPaymentValidationResult } from "src/modules/payments/common/interfaces/payment-failed";

export interface IMakeAuthorizationCancel {
  strategy: EPaymentAuthorizationCancelStrategy;
  context: IAuthorizationCancelPaymentContext;
  validationResult: IPaymentValidationResult;
}
