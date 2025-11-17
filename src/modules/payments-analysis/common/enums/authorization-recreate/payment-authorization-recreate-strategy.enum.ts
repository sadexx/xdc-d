export const enum EPaymentAuthorizationRecreateStrategy {
  REATTACH_EXISTING_PAYMENT = "reattach-existing-payment",
  INDIVIDUAL_CANCEL_AND_REAUTHORIZE = "individual-cancel-and-reauthorize",
  CORPORATE_CANCEL_AND_REAUTHORIZE = "corporate-cancel-and-reauthorize",
}
