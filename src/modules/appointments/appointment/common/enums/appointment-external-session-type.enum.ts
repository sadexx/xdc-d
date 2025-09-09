import { ValuesOf } from "src/common/types";

export const EAppointmentExternalSessionType = {
  CHECK_IN_FACE_TO_FACE: "check-in-face-to-face",
  CHECK_OUT_FACE_TO_FACE: "check-out-face-to-face",
  CHECK_IN_ALTERNATIVE_PLATFORM: "check-in-alternative-platform",
  CHECK_OUT_ALTERNATIVE_PLATFORM: "check-out-alternative-platform",
} as const;

export type EAppointmentExternalSessionType = ValuesOf<typeof EAppointmentExternalSessionType>;
