import { TCalculatePaymentPriceAppointment } from "src/modules/payments/common/types/pricing";

export interface ICalculatePaymentStartPrice {
  appointment: TCalculatePaymentPriceAppointment;
  isClientCorporate: boolean;
  country: string;
}
