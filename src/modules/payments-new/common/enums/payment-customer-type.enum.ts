import { ValuesOf } from "src/common/types";

export const EPaymentCustomerType = {
  INDIVIDUAL: "individual",
  CORPORATE: "corporate",
} as const;

export type EPaymentCustomerType = ValuesOf<typeof EPaymentCustomerType>;
