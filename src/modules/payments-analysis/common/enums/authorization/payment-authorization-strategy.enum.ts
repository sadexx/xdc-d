export const enum EPaymentAuthorizationStrategy {
  WAIT_LIST_REDIRECT = "wait-list-redirect",
  INDIVIDUAL_STRIPE_AUTH = "individual-stripe-auth",
  CORPORATE_DEPOSIT_CHARGE = "corporate-deposit-charge",
  CORPORATE_POST_PAYMENT = "corporate-post-payment",
  VALIDATION_FAILED = "validation-failed",
}
