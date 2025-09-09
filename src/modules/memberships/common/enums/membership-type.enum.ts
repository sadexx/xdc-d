import { ValuesOf } from "src/common/types";

export const EMembershipType = {
  BRONZE: "bronze",
  SILVER: "silver",
  GOLD: "gold",
} as const;

export type EMembershipType = ValuesOf<typeof EMembershipType>;

export const membershipTypeOrder = {
  [EMembershipType.BRONZE]: 1,
  [EMembershipType.SILVER]: 2,
  [EMembershipType.GOLD]: 3,
} as const satisfies Record<EMembershipType, number>;
