import { ValuesOf } from "src/common/types";

export const EAppointmentStatus = {
  PENDING_PAYMENT_CONFIRMATION: "pending-payment-confirmation",
  PENDING: "pending",
  CANCELLED_ORDER: "cancelled-order",
  ACCEPTED: "accepted",
  CANCELLED: "cancelled",
  CANCELLED_BY_SYSTEM: "cancelled-by-system",
  LIVE: "live",
  COMPLETED: "completed",
  NO_SHOW: "no-show",
} as const;

export type EAppointmentStatus = ValuesOf<typeof EAppointmentStatus>;

export const appointmentStatusOrder = {
  [EAppointmentStatus.LIVE]: 1,
  [EAppointmentStatus.PENDING]: 2,
  [EAppointmentStatus.ACCEPTED]: 3,
  [EAppointmentStatus.PENDING_PAYMENT_CONFIRMATION]: 4,
  [EAppointmentStatus.COMPLETED]: 5,
  [EAppointmentStatus.CANCELLED]: 6,
  [EAppointmentStatus.CANCELLED_ORDER]: 7,
  [EAppointmentStatus.CANCELLED_BY_SYSTEM]: 8,
  [EAppointmentStatus.NO_SHOW]: 9,
} as const satisfies Record<EAppointmentStatus, number>;
