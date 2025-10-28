import { NonNullableProperties } from "src/common/types";
import { TLoadPaymentCaptureContext } from "src/modules/payment-analysis/common/types/capture";

/**
 ** Type
 */

export type TCaptureItemWithAmount = TLoadPaymentCaptureContext["items"][number];

export type TAttemptStripePaymentCapture = NonNullableProperties<TCaptureItemWithAmount, "externalId">;
