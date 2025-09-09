import { ValuesOf } from "src/common/types";

export const EPaymentSystem = {
  STRIPE: "stripe",
  PAYPAL: "paypal",
  DEPOSIT: "deposit",
} as const;

export type EPaymentSystem = ValuesOf<typeof EPaymentSystem>;
