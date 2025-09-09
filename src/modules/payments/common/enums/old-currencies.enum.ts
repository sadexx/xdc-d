import { ValuesOf } from "src/common/types";

export const OldECurrencies = {
  AUD: "AUD",
  EUR: "EUR",
  USD: "USD",
} as const;

export type OldECurrencies = ValuesOf<typeof OldECurrencies>;
