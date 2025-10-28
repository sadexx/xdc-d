import { ValuesOf } from "src/common/types";

export const EPaymentDirection = {
  INCOMING: "incoming",
  OUTCOMING: "outcoming",
} as const;

export type EPaymentDirection = ValuesOf<typeof EPaymentDirection>;
