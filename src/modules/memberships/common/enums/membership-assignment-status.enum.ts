import { ValuesOf } from "src/common/types";

export const EMembershipAssignmentStatus = {
  ACTIVE: "active",
  DEACTIVATED: "deactivated",
  PAYMENT_FAILED: "payment-failed",
} as const;

export type EMembershipAssignmentStatus = ValuesOf<typeof EMembershipAssignmentStatus>;
