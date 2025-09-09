import { ValuesOf } from "src/common/types";

export const ELandingPart = {
  PROMO: "promo",
  REVIEWS: "reviews",
} as const;

export type ELandingPart = ValuesOf<typeof ELandingPart>;
