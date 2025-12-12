import { ValuesOf } from "src/common/types";

export const EPaymentSystem = {
  STRIPE: "stripe",
  PAYPAL: "paypal",
  DEPOSIT: "deposit",
  POST_PAYMENT: "post-payment",
} as const;

export type EPaymentSystem = ValuesOf<typeof EPaymentSystem>;
