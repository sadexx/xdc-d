import { ValuesOf } from "src/common/types";

export const EAppointmentInterpreterType = {
  IND_PROFESSIONAL_INTERPRETER: "ind-professional-interpreter",
  IND_LANGUAGE_BUDDY_INTERPRETER: "ind-language-buddy-interpreter",
} as const;

export type EAppointmentInterpreterType = ValuesOf<typeof EAppointmentInterpreterType>;
