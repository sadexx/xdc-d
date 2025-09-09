import { ValuesOf } from "src/common/types";

export const EInterpreterAppointmentCriteria = {
  AT_LEAST_ONE_COMPLETED_APPOINTMENT_PER_DAY: "1",
  AT_LEAST_3_COMPLETED_APPOINTMENT_PER_DAY: "3",
  AT_LEAST_5_COMPLETED_APPOINTMENT_PER_DAY: "5",
  AT_LEAST_10_COMPLETED_APPOINTMENT_PER_DAY: "10",
} as const;

export type EInterpreterAppointmentCriteria = ValuesOf<typeof EInterpreterAppointmentCriteria>;
