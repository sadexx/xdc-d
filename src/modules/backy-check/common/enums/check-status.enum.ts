import { ValuesOf } from "src/common/types";

export const EExtCheckStatus = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  VERIFIED: "Verified",
  IN_REVIEW: "In Review",
  CANCELLED: "Cancelled",
  READY: "Ready",
} as const;

export type EExtCheckStatus = ValuesOf<typeof EExtCheckStatus>;
