import { ValuesOf } from "src/common/types";

export const EMembershipPricingRegion = {
  GLOBAL: "global",
  AU: "au",
} as const;

export type EMembershipPricingRegion = ValuesOf<typeof EMembershipPricingRegion>;
