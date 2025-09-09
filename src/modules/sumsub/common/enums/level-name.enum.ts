import { ValuesOf } from "src/common/types";

export const EExtSumSubLevelName = {
  AUSTRALIA_OR_NZ_CITIZENS: "australia-or-NZ-citizens",
  NON_AUSTRALIA_OR_NZ_RESIDENTS: "non-australia-or-NZ-residents",
  INDIVIDUAL_TAKER: "individual-taker",
} as const;

export type EExtSumSubLevelName = ValuesOf<typeof EExtSumSubLevelName>;
