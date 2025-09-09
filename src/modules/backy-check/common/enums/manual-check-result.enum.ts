import { ValuesOf } from "src/common/types";

export const EManualCheckResult = {
  INITIAL: "initial",
  PENDING: "pending",
  MANUAL_APPROVED: "manual-approved",
  MANUAL_REJECTED: "manual-rejected",
} as const;

export type EManualCheckResult = ValuesOf<typeof EManualCheckResult>;
