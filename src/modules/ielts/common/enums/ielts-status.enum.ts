import { ValuesOf } from "src/common/types";

export const EIeltsStatus = {
  SUCCESS: "success",
  FAIL: "fail",
} as const;

export type EIeltsStatus = ValuesOf<typeof EIeltsStatus>;
