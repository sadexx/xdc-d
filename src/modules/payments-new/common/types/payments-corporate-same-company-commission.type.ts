import { NonNullableProperties } from "src/common/types";
import { ICapturePaymentContext } from "src/modules/payment-analysis/common/interfaces/capture";

/**
 ** Type
 */

export type TProcessSameCompanyCommissionContext = NonNullableProperties<ICapturePaymentContext, "commissionAmounts">;
