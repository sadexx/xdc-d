import { ValuesOf } from "src/common/types";

export const EPaymentStatus = {
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

export type EPaymentStatus = ValuesOf<typeof EPaymentStatus>;

export const paymentStatusOrder = {
  [EPaymentStatus.CREATED]: 1,
  [EPaymentStatus.AUTHORIZED]: 2,
  [EPaymentStatus.AUTHORIZATION_FAILED]: 3,
  [EPaymentStatus.CAPTURED]: 4,
  [EPaymentStatus.CAPTURE_FAILED]: 5,
  [EPaymentStatus.CANCELED]: 6,
  [EPaymentStatus.CANCEL_FAILED]: 7,
  [EPaymentStatus.SUCCESS]: 8,
  [EPaymentStatus.FAILED]: 9,
  [EPaymentStatus.TRANSFERED]: 10,
  [EPaymentStatus.TRANSFER_FAILED]: 11,
  [EPaymentStatus.PAYOUT_SUCCESS]: 12,
  [EPaymentStatus.PAYOUT_FAILED]: 13,
  [EPaymentStatus.DEPOSIT_PAYMENT_REQUEST_INITIALIZING]: 14,
  [EPaymentStatus.DEPOSIT_PAYMENT_REQUEST_CREATING]: 15,
  [EPaymentStatus.BANK_ACCOUNT_CHARGE_PENDING]: 16,
  [EPaymentStatus.PAYMENT_REQUEST_CREATED]: 17,
  [EPaymentStatus.BANK_ACCOUNT_CHARGE_TRANSACTION_CREATED]: 18,
  [EPaymentStatus.BANK_ACCOUNT_CHARGE_SUCCEEDED]: 19,
  [EPaymentStatus.PAYMENT_REQUEST_SUCCEEDED]: 20,
  [EPaymentStatus.REFUND]: 21,
  [EPaymentStatus.WAITING_FOR_PAYOUT]: 22,
} as const satisfies Record<EPaymentStatus, number>;
