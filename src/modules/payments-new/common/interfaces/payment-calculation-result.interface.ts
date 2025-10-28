import { DiscountSummary } from "src/modules/rates/common/interfaces";
import { IDiscountRate } from "src/modules/discounts/common/interfaces";

export interface IPaymentCalculationResult {
  clientAmount: number;
  clientGstAmount: number;
  clientFullAmount: number;
  interpreterAmount: number;
  interpreterGstAmount: number;
  interpreterFullAmount: number;
  appliedDiscounts?: DiscountSummary;
  discountRate?: IDiscountRate;
}
