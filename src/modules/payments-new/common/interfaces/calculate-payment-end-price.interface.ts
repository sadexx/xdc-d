import { TCalculatePaymentPriceAppointment } from "src/modules/payments-new/common/types";

export interface ICalculatePaymentEndPrice {
  appointment: TCalculatePaymentPriceAppointment;
  isClientCorporate: boolean;
  isInterpreterCorporate: boolean;
  clientCountry: string;
  interpreterCountry: string | null;
}
