import { ValuesOf } from "src/common/types";

export const EInterpreterExperienceYears = {
  ZERO_TO_ONE: "0-1",
  ONE_TO_FIVE: "1-5",
  FIVE_TO_TEN: "5-10",
  TEN_AND_ABOVE: "10+",
} as const;

export type EInterpreterExperienceYears = ValuesOf<typeof EInterpreterExperienceYears>;
