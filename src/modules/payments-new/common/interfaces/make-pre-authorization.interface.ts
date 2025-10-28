import { EPaymentAuthorizationStrategy } from "src/modules/payment-analysis/common/enums/authorization";
import { IAuthorizationPaymentContext } from "src/modules/payment-analysis/common/interfaces/authorization";
import { IPaymentValidationResult } from "src/modules/payments-new/common/interfaces";

export interface IMakePreAuthorization {
  strategy: EPaymentAuthorizationStrategy;
  context: IAuthorizationPaymentContext;
  validationResult: IPaymentValidationResult;
}
