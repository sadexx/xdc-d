import { ValuesOf } from "src/common/types";

export const EAppointmentInterpretingType = {
  CONSECUTIVE: "consecutive",
  SIGN_LANGUAGE: "sign-language",
  SIMULTANEOUS: "simultaneous",
  ESCORT: "escort",
} as const;

export type EAppointmentInterpretingType = ValuesOf<typeof EAppointmentInterpretingType>;

export const appointmentInterpretingTypeOrder = {
  [EAppointmentInterpretingType.CONSECUTIVE]: 1,
  [EAppointmentInterpretingType.SIGN_LANGUAGE]: 2,
  [EAppointmentInterpretingType.SIMULTANEOUS]: 3,
  [EAppointmentInterpretingType.ESCORT]: 4,
} as const satisfies Record<EAppointmentInterpretingType, number>;
