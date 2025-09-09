import { ValuesOf } from "src/common/types";

export const EExtMediaCapabilities = {
  NONE: "None",
  RECEIVE: "Receive",
  SEND: "Send",
  SEND_RECEIVE: "SendReceive",
} as const;

export type EExtMediaCapabilities = ValuesOf<typeof EExtMediaCapabilities>;
