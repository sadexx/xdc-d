import { ValuesOf } from "src/common/types";

export const ERateDetailsSequence = {
  FIRST_MINUTES: "first-minutes",
  ADDITIONAL_BLOCK: "additional-block",
  ALL_DAY: "all-day",
} as const;

export type ERateDetailsSequence = ValuesOf<typeof ERateDetailsSequence>;
