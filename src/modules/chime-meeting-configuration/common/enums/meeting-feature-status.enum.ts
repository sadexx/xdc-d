import { ValuesOf } from "src/common/types";

export const EExtMeetingFeatureStatus = {
  AVAILABLE: "AVAILABLE",
  UNAVAILABLE: "UNAVAILABLE",
} as const;

export type EExtMeetingFeatureStatus = ValuesOf<typeof EExtMeetingFeatureStatus>;
