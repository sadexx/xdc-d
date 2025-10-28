import { ValuesOf } from "src/common/types";

export const EStripeInterpreterPayoutType = {
  INTERNAL: "internal",
  EXTERNAL: "external",
} as const;

export type EStripeInterpreterPayoutType = ValuesOf<typeof EStripeInterpreterPayoutType>;
