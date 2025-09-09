import { ValuesOf } from "src/common/types";

export const EAppointmentSimultaneousInterpretingType = {
  CONFERENCE: "conference",
  CHUCHOTAGE: "chuchotage",
} as const;

export type EAppointmentSimultaneousInterpretingType = ValuesOf<typeof EAppointmentSimultaneousInterpretingType>;
