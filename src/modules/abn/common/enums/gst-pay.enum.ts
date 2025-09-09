import { ValuesOf } from "src/common/types";

export const EGstPayer = {
  YES: "yes",
  NO: "no",
} as const;

export type EGstPayer = ValuesOf<typeof EGstPayer>;
