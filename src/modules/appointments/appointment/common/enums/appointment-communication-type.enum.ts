import { ValuesOf } from "src/common/types";

export const EAppointmentCommunicationType = {
  VIDEO: "video",
  AUDIO: "audio",
  FACE_TO_FACE: "face-to-face",
} as const;

export type EAppointmentCommunicationType = ValuesOf<typeof EAppointmentCommunicationType>;

export const appointmentCommunicationTypeOrder = {
  [EAppointmentCommunicationType.AUDIO]: 1,
  [EAppointmentCommunicationType.VIDEO]: 2,
  [EAppointmentCommunicationType.FACE_TO_FACE]: 3,
} as const satisfies Record<EAppointmentCommunicationType, number>;
