import { ValuesOf } from "src/common/types";

export const EQueueType = {
  DEFAULT: "default-queue",
  PAYMENTS_QUEUE: "payments-queue",
  PAYMENTS_ANALYSIS_QUEUE: "payments-analysis-queue",
  PAYMENTS_EXECUTION_QUEUE: "payments-execution-queue",
  PDF_GENERATION_QUEUE: "pdf-generation-queue",
  NOTIFICATIONS_QUEUE: "notifications-queue",
  APPOINTMENTS_QUEUE: "appointments-queue",
  WEBHOOKS_QUEUE: "webhooks-queue",
} as const;

export type EQueueType = ValuesOf<typeof EQueueType>;
