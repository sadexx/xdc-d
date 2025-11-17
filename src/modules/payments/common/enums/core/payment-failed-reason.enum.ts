export const enum EPaymentFailedReason {
  INFO_NOT_FILLED = "Payment information not filled",
  AUTH_FAILED = "Payment authorization failed",
  DEPOSIT_CHARGE_FAILED = "Deposit charge failed",
  AUTH_FAILED_MORE_THAN_24H_REPEAT = "Your account does not have enough funds to cover the cost of the appointment. Please deposit the money into your account or change the payment method. Otherwise, your meeting will be cancelled 24 hours before the scheduled start time.",
  AUTH_FAILED_MORE_THAN_6H_FIRST_ATTEMPT = "Your account does not have enough funds to cover the cost of the appointment. Please deposit the money into your account within 30 minutes or the appointment will be cancelled.",
  AUTH_FAILED_FINAL = "Your meeting cancelled, because your account does not have enough funds to cover the cost of the appointment",
  PAYMENT_OPERATION_VALIDATION_FAILED = "Payment operation validation failed",
}
