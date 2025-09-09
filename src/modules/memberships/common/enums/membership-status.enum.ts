import { ValuesOf } from "src/common/types";

export const EMembershipStatus = {
  ACTIVE: "active",
  DEACTIVATED: "deactivated",
} as const;

export type EMembershipStatus = ValuesOf<typeof EMembershipStatus>;
