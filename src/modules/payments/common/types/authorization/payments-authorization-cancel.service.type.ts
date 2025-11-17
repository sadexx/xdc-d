import { IAuthorizationCancelPaymentContext } from "src/modules/payments-analysis/common/interfaces/authorization-cancel";

/**
 ** Type
 */

export type TReturnCompanyDepositContext = IAuthorizationCancelPaymentContext & {
  company: NonNullable<IAuthorizationCancelPaymentContext["company"]>;
};
