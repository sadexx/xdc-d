import { ValuesOf } from "src/common/types";

export const EQueueType = {
  DEFAULT: "default-queue",
  PAYMENTS_QUEUE: "payments-queue",
  NOTIFICATIONS_QUEUE: "notifications-queue",
  WEBHOOKS_QUEUE: "webhooks-queue",
  APPOINTMENTS_QUEUE: "appointments-queue",
} as const;

export type EQueueType = ValuesOf<typeof EQueueType>;
