import { ValuesOf } from "src/common/types";

export const OldEPaymentMethod = {
  PAYPAL_ACCOUNT: "paypal-account",
  BANK_ACCOUNT: "bank-account",
  CREDIT_CARD: "credit-card",
  DEPOSIT: "deposit",
} as const;

export type OldEPaymentMethod = ValuesOf<typeof OldEPaymentMethod>;

export const paymentMethodFilterMap = {
  [OldEPaymentMethod.PAYPAL_ACCOUNT]: "Paypal Account",
  [OldEPaymentMethod.BANK_ACCOUNT]: "Bank Account",
  [OldEPaymentMethod.CREDIT_CARD]: "Credit Card",
  [OldEPaymentMethod.DEPOSIT]: "Deposit of company",
} as const satisfies Record<OldEPaymentMethod, string>;
