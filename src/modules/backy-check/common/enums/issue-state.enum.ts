import { ValuesOf } from "src/common/types";

export const EExtIssueState = {
  SOUTH_AUSTRALIA: "South Australia",
  WESTERN_AUSTRALIA: "Western Australia",
  VICTORIA: "Victoria",
  TASMANIA: "Tasmania",
  QUEENSLAND: "Queensland",
  NORTHERN_TERRITORY: "Northern territory",
  NEW_SOUTH_WALES: "New South Wales",
  AUSTRALIA_CAPITAL_TERRITORY: "Australia Capital Territory",
} as const;

export type EExtIssueState = ValuesOf<typeof EExtIssueState>;
