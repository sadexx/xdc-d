import { ValuesOf } from "src/common/types";

export const ESortOrder = {
  ASC: "ASC",
  DESC: "DESC",
} as const;

export type ESortOrder = ValuesOf<typeof ESortOrder>;
