import { EPaymentCurrency, EPaymentStatus } from "src/modules/payments/common/enums/core";
import { EMembershipType } from "src/modules/memberships/common/enums";
import { Payment } from "src/modules/payments/entities";

export interface IPaymentItem {
  amount: string;
  gstAmount: string;
  fullAmount: string;
  currency: EPaymentCurrency;
  status: EPaymentStatus;
  payment: Payment;
  appliedPromoDiscountsPercent: number | null;
  appliedMembershipDiscountsPercent: number | null;
  appliedPromoDiscountsMinutes: number | null;
  appliedMembershipFreeMinutes: number | null;
  appliedPromoCode: string | null;
  appliedMembershipType: EMembershipType | null;
  amountOfAppliedDiscountByMembershipMinutes: string | null;
  amountOfAppliedDiscountByMembershipDiscount: string | null;
  amountOfAppliedDiscountByPromoCode: string | null;
  externalId: string | null;
  transferId: string | null;
  note: string | null;
}
