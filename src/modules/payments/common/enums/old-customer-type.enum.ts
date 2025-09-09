import { ValuesOf } from "src/common/types";

export const OldECustomerType = {
  INDIVIDUAL: "individual",
  CORPORATE: "corporate",
} as const;

export type OldECustomerType = ValuesOf<typeof OldECustomerType>;
