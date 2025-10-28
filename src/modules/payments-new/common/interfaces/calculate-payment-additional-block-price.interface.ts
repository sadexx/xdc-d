import { TCalculatePaymentPriceAppointment } from "src/modules/payments-new/common/types";
import { IDiscountRate } from "src/modules/discounts/common/interfaces";

export interface ICalculateAdditionalBlockPrice {
  appointment: TCalculatePaymentPriceAppointment;
  isClientCorporate: boolean;
  isInterpreterCorporate: boolean;
  country: string;
  additionalBlockDuration: number;
  discountRate?: IDiscountRate;
}
