import { ValuesOf } from "src/common/types";

export const EExtSumSubReviewRejectType = {
  FINAL: "FINAL",
  RETRY: "RETRY",
} as const;

export type EExtSumSubReviewRejectType = ValuesOf<typeof EExtSumSubReviewRejectType>;
