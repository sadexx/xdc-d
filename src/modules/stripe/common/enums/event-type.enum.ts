export const enum EExtEventType {
  ACCOUNT_UPDATED = "account.updated",
  ACCOUNT_EXTERNAL_CREATED = "account.external_account.created",
  ACCOUNT_EXTERNAL_UPDATED = "account.external_account.updated",
  ACCOUNT_EXTERNAL_DELETED = "account.external_account.deleted",
  PERSON_CREATED = "person.created",
  INVOICE_PAYMENT_SUCCEEDED = "invoice.payment_succeeded",
  INVOICE_PAYMENT_FAILED = "invoice.payment_failed",

  PAYMENT_INTENT_PROCESSING = "payment_intent.processing",
  CHARGE_PENDING = "charge.pending",
  PAYMENT_INTENT_CREATED = "payment_intent.created",
  CHARGE_UPDATED = "charge.updated",
  CHARGE_SUCCEEDED = "charge.succeeded",
  PAYMENT_INTENT_SUCCEEDED = "payment_intent.succeeded",
}
