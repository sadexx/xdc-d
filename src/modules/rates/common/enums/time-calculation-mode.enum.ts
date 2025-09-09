import { ValuesOf } from "src/common/types";

export const ETimeCalculationMode = {
  NORMAL: "normal",
  PEAK: "peak",
  CROSS_BOUNDARY: "cross-boundary",
} as const;

export type ETimeCalculationMode = ValuesOf<typeof ETimeCalculationMode>;
