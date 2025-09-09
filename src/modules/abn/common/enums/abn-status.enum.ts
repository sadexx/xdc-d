import { ValuesOf } from "src/common/types";

export const EExtAbnStatus = {
  ACTIVE: "Active",
  CANCELLED: "Cancelled",
} as const;

export type EExtAbnStatus = ValuesOf<typeof EExtAbnStatus>;
