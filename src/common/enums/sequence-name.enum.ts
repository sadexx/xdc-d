import { ValuesOf } from "src/common/types";

export const ESequenceName = {
  CUSTOMER: "customer_platform_id_seq",
  DRAFT_APPOINTMENT: "draft_appointment_platform_id_seq",
  APPOINTMENT: "appointment_platform_id_seq",
  APPOINTMENT_ORDER_GROUP: "appointment_order_group_platform_id_seq",
  CHANNEL: "channel_platform_id_seq",
  PAYMENT: "payment_platform_id_seq",
} as const;

export type ESequenceName = ValuesOf<typeof ESequenceName>;
