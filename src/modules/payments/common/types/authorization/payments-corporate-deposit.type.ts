import { NonNullableProperties } from "src/common/types";
import { IAuthorizationPaymentContext } from "src/modules/payments-analysis/common/interfaces/authorization";

/**
 ** Type
 */

export type TChargeFromDepositContext = NonNullableProperties<
  IAuthorizationPaymentContext,
  "companyContext" | "prices"
> & {
  companyAdditionalDataContext: NonNullableProperties<
    NonNullable<IAuthorizationPaymentContext["companyAdditionalDataContext"]>,
    "depositChargeContext"
  >;
};
