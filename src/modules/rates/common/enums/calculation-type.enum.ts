import { ValuesOf } from "src/common/types";

export const ECalculationType = {
  PRELIMINARY_ESTIMATE: "preliminary-estimate",
  SINGLE_BLOCK: "single-block",
  DETAILED_BREAKDOWN: "detailed-breakdown",
  APPOINTMENT_START_PRICE: "appointment-start-price",
  APPOINTMENT_END_PRICE: "appointment-end-price",
} as const;

export type ECalculationType = ValuesOf<typeof ECalculationType>;
