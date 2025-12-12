import { ValuesOf } from "src/common/types";

export const ECompanyFundingSource = {
  DEPOSIT: "deposit",
  POST_PAYMENT: "post-payment",
} as const;

export type ECompanyFundingSource = ValuesOf<typeof ECompanyFundingSource>;
