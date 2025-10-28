import { TCalculatePaymentPriceAppointment } from "src/modules/payments-new/common/types";

export interface ICalculatePaymentStartPrice {
  appointment: TCalculatePaymentPriceAppointment;
  isClientCorporate: boolean;
  country: string;
}
