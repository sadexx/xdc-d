import { ValuesOf } from "src/common/types";

export const EExtSumSubApplicantType = {
  COMPANY: "company",
  INDIVIDUAL: "individual",
} as const;

export type EExtSumSubApplicantType = ValuesOf<typeof EExtSumSubApplicantType>;
