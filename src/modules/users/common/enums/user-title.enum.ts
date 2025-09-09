import { ValuesOf } from "src/common/types";

export const EUserTitle = {
  MR: "mr",
  MRS: "mrs",
  MISS: "miss",
  MS: "ms",
  DR: "dr",
  PROF: "prof",
  JUDGE: "judge",
} as const;

export type EUserTitle = ValuesOf<typeof EUserTitle>;
