import { EPaymentStatus } from "src/modules/payments/common/enums/core";

export const MINIMUM_DEPOSIT_CHARGE_AMOUNT: number = 300;

export const UNFINISHED_DEPOSIT_CHARGE_STATUSES: readonly EPaymentStatus[] = [
  EPaymentStatus.DEPOSIT_PAYMENT_REQUEST_INITIALIZING,
  EPaymentStatus.DEPOSIT_PAYMENT_REQUEST_CREATING,
  EPaymentStatus.BANK_ACCOUNT_CHARGE_PENDING,
  EPaymentStatus.PAYMENT_REQUEST_CREATED,
  EPaymentStatus.BANK_ACCOUNT_CHARGE_TRANSACTION_CREATED,
  EPaymentStatus.BANK_ACCOUNT_CHARGE_SUCCEEDED,
];
