import { ValuesOf } from "src/common/types";

export const OldEPaymentStatus = {
  /*
   * STRIPE CLIENT STATUSES
   */
  CREATED: "created",
  AUTHORIZED: "authorized",
  AUTHORIZATION_FAILED: "authorization-failed",
  CAPTURED: "captured",
  CAPTURE_FAILED: "capture-failed",
  CANCELED: "canceled",
  CANCEL_FAILED: "cancel-failed",
  SUCCESS: "success",
  FAILED: "failed",

  /*
   * STRIPE INTERPRETER STATUSES
   */
  TRANSFERED: "transfered",
  TRANSFER_FAILED: "transfer-failed",
  PAYOUT_SUCCESS: "payout-success",
  PAYOUT_FAILED: "payout-failed",

  /*
   * STRIPE DEPOSIT CHARGE STATUSES
   */
  DEPOSIT_PAYMENT_REQUEST_INITIALIZING: "payment-request-initializing",
  DEPOSIT_PAYMENT_REQUEST_CREATING: "payment-request-creating",
  BANK_ACCOUNT_CHARGE_PENDING: "bank-account-charge-pending",
  PAYMENT_REQUEST_CREATED: "payment-request-created",
  BANK_ACCOUNT_CHARGE_TRANSACTION_CREATED: "bank-account-charge-transaction-created",
  BANK_ACCOUNT_CHARGE_SUCCEEDED: "bank-account-charge-succeeded",
  PAYMENT_REQUEST_SUCCEEDED: "payment-request-succeeded",

  /*
   * CORPORATE STATUSES
   */

  REFUND: "refund",

  /*
   * CORPORATE PAYOUT WAITING STATUSES
   */
  WAITING_FOR_PAYOUT: "payment-waiting-for-payout",
} as const;

export type OldEPaymentStatus = ValuesOf<typeof OldEPaymentStatus>;

export const paymentStatusOrder = {
  [OldEPaymentStatus.CREATED]: 1,
  [OldEPaymentStatus.AUTHORIZED]: 2,
  [OldEPaymentStatus.AUTHORIZATION_FAILED]: 3,
  [OldEPaymentStatus.CAPTURED]: 4,
  [OldEPaymentStatus.CAPTURE_FAILED]: 5,
  [OldEPaymentStatus.CANCELED]: 6,
  [OldEPaymentStatus.CANCEL_FAILED]: 7,
  [OldEPaymentStatus.SUCCESS]: 8,
  [OldEPaymentStatus.FAILED]: 9,
  [OldEPaymentStatus.TRANSFERED]: 10,
  [OldEPaymentStatus.TRANSFER_FAILED]: 11,
  [OldEPaymentStatus.PAYOUT_SUCCESS]: 12,
  [OldEPaymentStatus.PAYOUT_FAILED]: 13,
  [OldEPaymentStatus.DEPOSIT_PAYMENT_REQUEST_INITIALIZING]: 14,
  [OldEPaymentStatus.DEPOSIT_PAYMENT_REQUEST_CREATING]: 15,
  [OldEPaymentStatus.BANK_ACCOUNT_CHARGE_PENDING]: 16,
  [OldEPaymentStatus.PAYMENT_REQUEST_CREATED]: 17,
  [OldEPaymentStatus.BANK_ACCOUNT_CHARGE_TRANSACTION_CREATED]: 18,
  [OldEPaymentStatus.BANK_ACCOUNT_CHARGE_SUCCEEDED]: 19,
  [OldEPaymentStatus.PAYMENT_REQUEST_SUCCEEDED]: 20,
  [OldEPaymentStatus.REFUND]: 21,
  [OldEPaymentStatus.WAITING_FOR_PAYOUT]: 22,
} as const satisfies Record<OldEPaymentStatus, number>;
