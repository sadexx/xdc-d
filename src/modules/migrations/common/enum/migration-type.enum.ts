import { ValuesOf } from "src/common/types";

export const MigrationType = {
  APPLIED: "applied",
  ROLLBACK: "rollback",
} as const;

export type MigrationType = ValuesOf<typeof MigrationType>;
