export const enum EPaymentOperation {
  AUTHORIZE_PAYMENT = "authorize-payment",
  AUTHORIZE_ADDITIONAL_BLOCK_PAYMENT = "authorize-additional-block-payment",
  AUTHORIZATION_RECREATE_PAYMENT = "authorization-recreate-payment",
  AUTHORIZATION_CANCEL_PAYMENT = "authorization-cancel-payment",
  CAPTURE_PAYMENT = "capture-payment",
  TRANSFER_PAYMENT = "transfer-payment",
}
