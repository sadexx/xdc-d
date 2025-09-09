import { ValuesOf } from "src/common/types";

export const OldEPaymentDirection = {
  INCOMING: "incoming",
  OUTCOMING: "outcoming",
} as const;

export type OldEPaymentDirection = ValuesOf<typeof OldEPaymentDirection>;
