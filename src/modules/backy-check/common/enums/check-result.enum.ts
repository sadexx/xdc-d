import { ValuesOf } from "src/common/types";

export const EExtCheckResult = {
  CLEAR: "Clear",
  CONSIDER: "Consider",
  NOT_AVAILABLE: "Not available",
} as const;

export type EExtCheckResult = ValuesOf<typeof EExtCheckResult>;
