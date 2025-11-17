import { ValuesOf } from "src/common/types";

export const EPaymentMethod = {
  PAYPAL_ACCOUNT: "paypal-account",
  BANK_ACCOUNT: "bank-account",
  CREDIT_CARD: "credit-card",
  DEPOSIT: "deposit",
} as const;

export type EPaymentMethod = ValuesOf<typeof EPaymentMethod>;

export const paymentMethodFilterMap = {
  [EPaymentMethod.PAYPAL_ACCOUNT]: "Paypal Account",
  [EPaymentMethod.BANK_ACCOUNT]: "Bank Account",
  [EPaymentMethod.CREDIT_CARD]: "Credit Card",
  [EPaymentMethod.DEPOSIT]: "Deposit of company",
} as const satisfies Record<EPaymentMethod, string>;
