export const enum EJobType {
  DEFAULT = "default",
  PROCESS_STRIPE_CANCEL_SUBSCRIPTIONS = "process-stripe-cancel-subscriptions",
  PROCESS_STRIPE_UPDATE_SUBSCRIPTIONS_PRICE = "process-stripe-update-subscriptions-price",
  PROCESS_NOTIFY_MEMBERSHIP_CHANGES = "process-notify-membership-changes",
  PROCESS_SUMSUB_WEBHOOK = "process-sumsub-webhook",
  PROCESS_DOCUSIGN_WEBHOOK = "process-docusign-webhook",
  PROCESS_STRIPE_WEBHOOK = "process-stripe-webhook",
  PROCESS_CLOSE_MEETING = "process-close-meeting",
  PROCESS_CHECK_IN_OUT_APPOINTMENT = "process-check-in-out-appointment",
  PROCESS_CLOSE_MEETING_WITHOUT_CLIENT_VISIT = "process-close-meeting-without-client-visit",
}
