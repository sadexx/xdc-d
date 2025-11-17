import { EAccountStatus } from "src/modules/users/common/enums";
import { EPaymentStatus } from "src/modules/payments/common/enums/core";

export const DUE_PAYMENT_STATUSES: readonly EPaymentStatus[] = [
  EPaymentStatus.CAPTURED,
  EPaymentStatus.TRANSFERED,
  EPaymentStatus.PAYOUT_SUCCESS,
  EPaymentStatus.SUCCESS,
];

export const ACCOUNT_STATUSES_ALLOWED_TO_IMMEDIATELY_DELETING: readonly EAccountStatus[] = [
  EAccountStatus.INVITATION_LINK,
  EAccountStatus.REGISTERED,
  EAccountStatus.START_REGISTRATION,
];
