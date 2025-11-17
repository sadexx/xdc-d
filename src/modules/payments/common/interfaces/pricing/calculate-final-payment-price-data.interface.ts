import {
  TCalculateFinalPaymentPricePayment,
  TCalculatePaymentPriceAppointment,
} from "src/modules/payments/common/types/pricing";

export interface ICalculateFinalPaymentPriceData {
  appointment: TCalculatePaymentPriceAppointment;
  payment: TCalculateFinalPaymentPricePayment;
  isClientCorporate: boolean;
  isInterpreterCorporate: boolean;
  clientCountry: string;
  interpreterCountry: string | null;
}
