import { ValuesOf } from "src/common/types";

export const OldEReceiptType = {
  INVOICE: "invoice",
  REMITTANCE_ADVICE: "remittance-advice",
  TAX_INVOICE: "tax-invoice",
} as const;

export type OldEReceiptType = ValuesOf<typeof OldEReceiptType>;
