import { ValuesOf } from "src/common/types";

export const EBackgroundCallType = {
  CALL_TO_CLIENT: "call-to-client",
  CALL_TO_INTERPRETER: "call-to-interpreter",
  CALL_TO_EXTERNAL_PARTICIPANTS: "call-to-external-participants",
} as const;

export type EBackgroundCallType = ValuesOf<typeof EBackgroundCallType>;
