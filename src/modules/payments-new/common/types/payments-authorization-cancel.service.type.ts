import { IAuthorizationCancelPaymentContext } from "src/modules/payment-analysis/common/interfaces/authorization-cancel";

/**
 ** Type
 */

export type TReturnCompanyDepositContext = IAuthorizationCancelPaymentContext & {
  company: NonNullable<IAuthorizationCancelPaymentContext["company"]>;
};
