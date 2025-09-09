import { ValuesOf } from "src/common/types";

export const ERepeatInterval = {
  EVERY_DAY: "every-day",
  EVERY_6_HOURS: "every-6-hours",
  EVERY_30_MINUTES: "every-30-minutes",
  EVERY_5_MINUTES: "every-5-minutes",
  NO_REPEAT: "no-repeat",

  /**
   ** For Face to Face only
   */

  EVERY_2_HOURS: "every-2-hours",
  EVERY_15_MINUTES: "every-15-minutes",
} as const;

export type ERepeatInterval = ValuesOf<typeof ERepeatInterval>;
