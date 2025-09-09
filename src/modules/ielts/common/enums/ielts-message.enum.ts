import { ValuesOf } from "src/common/types";

export const EIeltsMessage = {
  RESULTS_NOT_FOUND: "client-results-not-found-on-ielts",
  SCORE_NOT_ENOUGH: "client-overall-band-score-not-enough",
  NAME_DOES_NOT_MATCH: "client-name-does-not-match",
} as const;

export type EIeltsMessage = ValuesOf<typeof EIeltsMessage>;
