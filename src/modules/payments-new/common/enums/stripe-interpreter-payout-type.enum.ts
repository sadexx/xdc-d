import { ValuesOf } from "src/common/types";

export const EStripeInterpreterPayOutType = {
  INTERNAL: "internal",
  EXTERNAL: "external",
} as const;

export type EStripeInterpreterPayOutType = ValuesOf<typeof EStripeInterpreterPayOutType>;
