import { EAppointmentExternalSessionType } from "src/modules/appointments/appointment/common/enums";

export const CHECK_IN_APPOINTMENT_TYPES: readonly EAppointmentExternalSessionType[] = [
  EAppointmentExternalSessionType.CHECK_IN_FACE_TO_FACE,
  EAppointmentExternalSessionType.CHECK_IN_ALTERNATIVE_PLATFORM,
];

export const CHECK_OUT_APPOINTMENT_TYPES: readonly EAppointmentExternalSessionType[] = [
  EAppointmentExternalSessionType.CHECK_OUT_FACE_TO_FACE,
  EAppointmentExternalSessionType.CHECK_OUT_ALTERNATIVE_PLATFORM,
];
