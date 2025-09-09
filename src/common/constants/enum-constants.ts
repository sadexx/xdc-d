import { OldEPaymentStatus } from "src/modules/payments/common/enums";
import { EAccountStatus } from "src/modules/users/common/enums";

export const DUE_PAYMENT_STATUSES: readonly OldEPaymentStatus[] = [
  OldEPaymentStatus.CAPTURED,
  OldEPaymentStatus.TRANSFERED,
  OldEPaymentStatus.PAYOUT_SUCCESS,
  OldEPaymentStatus.SUCCESS,
];

export const ACCOUNT_STATUSES_ALLOWED_TO_IMMEDIATELY_DELETING: readonly EAccountStatus[] = [
  EAccountStatus.INVITATION_LINK,
  EAccountStatus.REGISTERED,
  EAccountStatus.START_REGISTRATION,
];
