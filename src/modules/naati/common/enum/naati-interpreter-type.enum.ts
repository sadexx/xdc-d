import { ValuesOf } from "src/common/types";

export const EExtNaatiInterpreterType = {
  INTERPRETER: "interpreter",
  DEAF_INTERPRETER: "deaf_interpreter",
} as const;

export type EExtNaatiInterpreterType = ValuesOf<typeof EExtNaatiInterpreterType>;
