import { ValuesOf } from "src/common/types";

export const EAppointmentSchedulingType = {
  ON_DEMAND: "on-demand",
  PRE_BOOKED: "pre-booked",
} as const;

export type EAppointmentSchedulingType = ValuesOf<typeof EAppointmentSchedulingType>;

export const appointmentSchedulingTypeOrder = {
  [EAppointmentSchedulingType.ON_DEMAND]: 1,
  [EAppointmentSchedulingType.PRE_BOOKED]: 2,
} as const satisfies Record<EAppointmentSchedulingType, number>;
