import { ValuesOf } from "src/common/types";

export const ERateQualifier = {
  STANDARD_HOURS: "standard-hours",
  AFTER_HOURS: "after-hours",
  WORKING_DAY: "working-day",
} as const;

export type ERateQualifier = ValuesOf<typeof ERateQualifier>;
