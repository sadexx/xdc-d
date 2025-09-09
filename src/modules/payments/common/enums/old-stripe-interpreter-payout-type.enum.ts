import { ValuesOf } from "src/common/types";

export const OldEStripeInterpreterPayoutType = {
  INTERNAL: "internal",
  EXTERNAL: "external",
} as const;

export type OldEStripeInterpreterPayoutType = ValuesOf<typeof OldEStripeInterpreterPayoutType>;
