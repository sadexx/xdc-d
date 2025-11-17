import { ValuesOf } from "src/common/types";

export const EPaymentReceiptType = {
  INVOICE: "invoice",
  REMITTANCE_ADVICE: "remittance-advice",
  TAX_INVOICE: "tax-invoice",
} as const;

export type EPaymentReceiptType = ValuesOf<typeof EPaymentReceiptType>;
