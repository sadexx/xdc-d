import { NonNullableProperties } from "src/common/types";
import { IAuthorizationPaymentContext } from "src/modules/payments-analysis/common/interfaces/authorization";

/**
 ** Type
 */

export type TChargeFromCompanyDeposit = NonNullableProperties<
  IAuthorizationPaymentContext,
  "companyContext" | "depositChargeContext"
>;

export type TCreateDepositChargePaymentRecord = NonNullableProperties<
  IAuthorizationPaymentContext,
  "prices" | "companyContext"
>;
