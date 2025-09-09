import { ValuesOf } from "src/common/types";

export const EAppointmentParticipantType = {
  TWO_WAY: "two-way",
  MULTI_WAY: "multi-way",
} as const;

export type EAppointmentParticipantType = ValuesOf<typeof EAppointmentParticipantType>;
