import { EAppointmentCommunicationType, EAppointmentStatus } from "src/modules/appointments/appointment/common/enums";

export const AUDIO_VIDEO_COMMUNICATION_TYPES: readonly EAppointmentCommunicationType[] = [
  EAppointmentCommunicationType.AUDIO,
  EAppointmentCommunicationType.VIDEO,
];

export const CONFLICT_APPOINTMENT_CONFIRMED_STATUSES: readonly EAppointmentStatus[] = [
  EAppointmentStatus.PENDING_PAYMENT_CONFIRMATION,
  EAppointmentStatus.PENDING,
  EAppointmentStatus.ACCEPTED,
  EAppointmentStatus.LIVE,
];

export const CONFLICT_APPOINTMENT_ACCEPTED_STATUSES: readonly EAppointmentStatus[] = [
  EAppointmentStatus.ACCEPTED,
  EAppointmentStatus.LIVE,
];

export const CANCELLED_APPOINTMENT_STATUSES: readonly EAppointmentStatus[] = [
  EAppointmentStatus.CANCELLED,
  EAppointmentStatus.CANCELLED_ORDER,
  EAppointmentStatus.CANCELLED_BY_SYSTEM,
  EAppointmentStatus.NO_SHOW,
];

export const COMPLETED_APPOINTMENT_STATUSES: readonly EAppointmentStatus[] = [
  ...CANCELLED_APPOINTMENT_STATUSES,
  EAppointmentStatus.COMPLETED,
];

export const APPOINTMENT_NOT_FINAL_STATUSES: readonly EAppointmentStatus[] = [];
