import { Payment, PaymentItem } from "src/modules/payments/entities";
import { Company } from "src/modules/companies/entities";
import { FindOptionsSelect } from "typeorm";
import { QueryResultType, StrictOmit } from "src/common/types";

/**
 ** Type
 */

export type TCalculateFinalPaymentPricePayment = Pick<Payment, "id"> & {
  items: TCalculateFinalPaymentPricePaymentItem[];
  company: TCalculateFinalPaymentPriceCompany | null;
};

export type TCalculateFinalPaymentPricePaymentItem = StrictOmit<
  Pick<PaymentItem, "id" | "fullAmount" | "amount" | "gstAmount">,
  "amount" | "gstAmount" | "fullAmount"
> & {
  amount: number;
  gstAmount: number;
  fullAmount: number;
};

export type TCalculateFinalPaymentPriceCompany = StrictOmit<
  Pick<Company, "id" | "depositAmount" | "fundingSource">,
  "depositAmount"
> & { depositAmount: number | null };

/**
 ** Query types
 */

export const UpdatePaymentTotalsQuery = {
  select: { amount: true, gstAmount: true, fullAmount: true } as const satisfies FindOptionsSelect<PaymentItem>,
};
export type TUpdatePaymentTotals = QueryResultType<PaymentItem, typeof UpdatePaymentTotalsQuery.select>;
