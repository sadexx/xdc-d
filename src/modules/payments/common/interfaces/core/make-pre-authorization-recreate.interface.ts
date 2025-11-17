import { EPaymentAuthorizationRecreateStrategy } from "src/modules/payments-analysis/common/enums/authorization-recreate";
import { IAuthorizationRecreatePaymentContext } from "src/modules/payments-analysis/common/interfaces/authorization-recreate";

export interface IMakePreAuthorizationRecreate {
  strategy: EPaymentAuthorizationRecreateStrategy;
  context: IAuthorizationRecreatePaymentContext;
}
