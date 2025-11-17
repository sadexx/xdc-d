import { NonNullableProperties } from "src/common/types";
import { ITransferPaymentContext } from "src/modules/payments-analysis/common/interfaces/transfer";

/**
 ** Type
 */

export type TMakeRecordToPayOutWaitListContext = NonNullableProperties<ITransferPaymentContext, "company">;
