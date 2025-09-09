import { ValuesOf } from "src/common/types";

export const EExtSumSubReviewStatus = {
  INIT: "init",
  PENDING: "pending",
  PRECHECKED: "prechecked",
  QUEUED: "queued",
  COMPLETED: "completed",
  ON_HOLD: "onHold",
} as const;

export type EExtSumSubReviewStatus = ValuesOf<typeof EExtSumSubReviewStatus>;
