import { EPaymentAuthorizationCancelStrategy } from "src/modules/payment-analysis/common/enums/authorization-cancel";
import { IAuthorizationCancelPaymentContext } from "src/modules/payment-analysis/common/interfaces/authorization-cancel";
import { IPaymentValidationResult } from "src/modules/payments-new/common/interfaces";

export interface IMakeAuthorizationCancel {
  strategy: EPaymentAuthorizationCancelStrategy;
  context: IAuthorizationCancelPaymentContext;
  validationResult: IPaymentValidationResult;
}
