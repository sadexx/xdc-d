import { ValuesOf } from "src/common/types";

export const EPaymentCurrency = {
  AUD: "AUD",
  EUR: "EUR",
  USD: "USD",
} as const;

export type EPaymentCurrency = ValuesOf<typeof EPaymentCurrency>;
