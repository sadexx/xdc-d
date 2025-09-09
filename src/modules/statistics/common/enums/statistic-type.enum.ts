import { ValuesOf } from "src/common/types";

export const EStatisticType = {
  DAILY: "daily",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
  YEARLY: "yearly",
} as const;

export type EStatisticType = ValuesOf<typeof EStatisticType>;
