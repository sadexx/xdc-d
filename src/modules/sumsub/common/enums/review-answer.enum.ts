import { ValuesOf } from "src/common/types";

export const EExtSumSubReviewAnswer = {
  GREEN: "GREEN",
  RED: "RED",
} as const;

export type EExtSumSubReviewAnswer = ValuesOf<typeof EExtSumSubReviewAnswer>;
