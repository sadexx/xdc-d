import { ValuesOf } from "src/common/types";

export const EChannelStatus = {
  INITIALIZED: "initialized",
  NEW: "new",
  IN_PROGRESS: "in-progress",
  RESOLVED: "resolved",
} as const;

export type EChannelStatus = ValuesOf<typeof EChannelStatus>;
