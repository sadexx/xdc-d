import { IDiscountRate } from "src/modules/discounts/common/interfaces";

export interface OldICalculateAppointmentPrices {
  amount: number;
  gstAmount: number;
  discountByMembershipMinutes: number;
  discountByMembershipDiscount: number;
  discountByPromoCode: number;
  discounts: IDiscountRate | null;
}
