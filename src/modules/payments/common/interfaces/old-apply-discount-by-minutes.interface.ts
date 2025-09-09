import { OldICalculatePrice } from "src/modules/rates-old/common/interfaces";

export interface OldIApplyDiscountByMinutes {
  fullAmount: number;
  newPrice: OldICalculatePrice;
  appointmentMinutesRemnant: number;
  isGstCalculated: boolean;
}
