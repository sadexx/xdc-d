import { EPaymentCurrency, EPaymentStatus } from "src/modules/payments-new/common/enums";
import { EMembershipType } from "src/modules/memberships/common/enums";
import { Payment } from "src/modules/payments-new/entities";

export interface IPaymentItem {
  amount: number;
  gstAmount: number;
  fullAmount: number;
  currency: EPaymentCurrency;
  status: EPaymentStatus;
  payment: Payment;
  appliedPromoDiscountsPercent: number | null;
  appliedMembershipDiscountsPercent: number | null;
  appliedPromoDiscountsMinutes: number | null;
  appliedMembershipFreeMinutes: number | null;
  appliedPromoCode: string | null;
  appliedMembershipType: EMembershipType | null;
  amountOfAppliedDiscountByMembershipMinutes: number | null;
  amountOfAppliedDiscountByMembershipDiscount: number | null;
  amountOfAppliedDiscountByPromoCode: number | null;
  externalId: string | null;
  transferId: string | null;
  note: string | null;
}
