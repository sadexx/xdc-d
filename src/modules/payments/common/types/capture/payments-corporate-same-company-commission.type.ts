import { NonNullableProperties } from "src/common/types";
import { ICapturePaymentContext } from "src/modules/payments-analysis/common/interfaces/capture";

/**
 ** Type
 */

export type TProcessSameCompanyCommissionContext = NonNullableProperties<
  ICapturePaymentContext,
  "commissionAmounts"
> & {
  payment: NonNullableProperties<ICapturePaymentContext["payment"], "company">;
};
