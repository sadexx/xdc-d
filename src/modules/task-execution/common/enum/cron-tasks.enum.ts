import { ValuesOf } from "src/common/types";

export const ECronTasks = {
  AUTO_CHECK_BACKY_CHECK_STATUS: "auto-check-backy-check-status",
  AUTO_REMINDER_NOTIFICATIONS: "auto-reminder-notifications",
  AUTO_DELETION_NOTIFICATIONS: "auto-deletion-notifications",
  AUTO_DELETION_DRAFT_APPOINTMENTS: "auto-deletion-draft-appointments",
  AUTO_ACTIVATE_UPCOMING_APPOINTMENTS: "auto-activate-upcoming-appointments",
  AUTO_CLOSE_INACTIVE_OR_PAYMENT_FAILED_LIVE_APPOINTMENTS: "auto-close-inactive-or-payment-failed-live-appointments",
  AUTO_CLOSE_EXPIRED_APPOINTMENTS_WITHOUT_CLIENT_VISIT: "auto-close-expired-appointments-without-client-visit",
  AUTO_DELETE_OLD_CHANNELS: "auto-delete-old-channels",
  AUTO_PROCESS_EXPIRED_APPOINTMENTS_WITHOUT_CHECK_IN: "auto-process-expired-appointments-without-check-in",
  AUTO_PROCESS_INTERPRETER_HAS_LATE_APPOINTMENTS: "auto-process-interpreter-has-late-appointments",
  AUTO_PROCESS_NEXT_REPEAT_TIME_ORDERS: "auto-process-next-repeat-time-orders",
  AUTO_PROCESS_NOTIFY_ADMIN_ORDERS: "auto-process-notify-admin-orders",
  AUTO_PROCESS_END_SEARCH_TIME_ORDERS: "auto-process-end-search-time-orders",
  AUTO_PROCESS_SEARCH_ENGINE_TASKS: "auto-process-search-engine-tasks",
  AUTO_PROCESS_SCHEDULED_REMOVALS: "auto-process-scheduled-removals",
  FILL_DAILY_STATISTICS: "fill-daily-statistics",
  FILL_WEEKLY_STATISTICS: "fill-weekly-statistics",
  FILL_MONTHLY_STATISTICS: "fill-monthly-statistics",
  FILL_YEARLY_STATISTICS: "fill-yearly-statistics",
  AUTO_DEACTIVATE_EXPIRED_MEMBERSHIPS: "auto-deactivate-expired-memberships",
  AUTO_CHECK_PAYMENT_WAIT_LIST: "auto-check-payment-wait-list",
  AUTO_CHECK_DEPOSIT_CHARGES: "auto-check-deposit-charges",
  AUTO_MAKE_CORPORATE_PAYOUTS: "auto-make-corporate-payouts",
  AUTO_UNLOCK_INTERPRETER_PROFILES: "auto-unlock-interpreter-profiles",
  AUTO_RESET_INTERPRETER_CANCELLATION_RECORDS: "auto-reset-interpreter-cancellation-records",
  AUTO_UPDATE_PROMO_CAMPAIGN_STATUSES: "auto-update-promo-campaign-statuses",
  AUTO_REMOVE_OLD_PROMO_CAMPAIGNS: "auto-remove-old-promo-campaigns",
  AUTO_REMOVE_UNUSED_PROMO_CAMPAIGN_BANNERS: "auto-remove-unused-promo-campaign-banners",
} as const;

export type ECronTasks = ValuesOf<typeof ECronTasks>;
