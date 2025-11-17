import { TCalculatePaymentPriceAppointment } from "src/modules/payments/common/types/pricing";

export interface ICalculatePaymentEndPrice {
  appointment: TCalculatePaymentPriceAppointment;
  isClientCorporate: boolean;
  isInterpreterCorporate: boolean;
  clientCountry: string;
  interpreterCountry: string | null;
}
