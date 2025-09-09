import { ValuesOf } from "src/common/types";

export const EInterpreterType = {
  INTERPRETER: "interpreter",
  DEAF_INTERPRETER: "deaf-interpreter",
} as const;

export type EInterpreterType = ValuesOf<typeof EInterpreterType>;
