import { EPaymentAuthorizationStrategy } from "src/modules/payments-analysis/common/enums/authorization";
import { IAuthorizationPaymentContext } from "src/modules/payments-analysis/common/interfaces/authorization";
import { IPaymentValidationResult } from "src/modules/payments/common/interfaces/payment-failed";

export interface IMakePreAuthorization {
  strategy: EPaymentAuthorizationStrategy;
  context: IAuthorizationPaymentContext;
  validationResult: IPaymentValidationResult;
}
