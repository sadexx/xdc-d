import { Payment, PaymentItem } from "src/modules/payments-new/entities";
import { Company } from "src/modules/companies/entities";

/**
 ** Type
 */

export type TCalculateFinalPaymentPricePayment = Pick<Payment, "id"> & {
  items: Array<TCalculateFinalPaymentPricePaymentItem>;
  company: TCalculateFinalPaymentPriceCompany | null;
};

export type TCalculateFinalPaymentPricePaymentItem = Pick<PaymentItem, "id" | "fullAmount" | "amount" | "gstAmount">;

export type TCalculateFinalPaymentPriceCompany = Pick<Company, "id" | "depositAmount">;
