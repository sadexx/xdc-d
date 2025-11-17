import { TCalculatePaymentPriceAppointment } from "src/modules/payments/common/types/pricing";

export interface ICalculateAdditionalBlockPrice {
  appointment: TCalculatePaymentPriceAppointment;
  isClientCorporate: boolean;
  isInterpreterCorporate: boolean;
  country: string;
  additionalBlockDuration: number;
}
