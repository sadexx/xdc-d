import { ValuesOf } from "src/common/types";

export const EAppointmentTopic = {
  GENERAL: "general",
  LEGAL: "legal",
  MEDICAL: "medical",
} as const;

export type EAppointmentTopic = ValuesOf<typeof EAppointmentTopic>;

export const appointmentTopicOrder = {
  [EAppointmentTopic.GENERAL]: 1,
  [EAppointmentTopic.LEGAL]: 2,
  [EAppointmentTopic.MEDICAL]: 3,
} as const satisfies Record<EAppointmentTopic, number>;
