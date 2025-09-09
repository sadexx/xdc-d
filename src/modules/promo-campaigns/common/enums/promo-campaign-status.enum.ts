import { ValuesOf } from "src/common/types";

export const EPromoCampaignStatus = {
  PENDING: "pending",
  ON_GOING: "on-going",
  COMPLETED: "completed",
  TERMINATED: "terminated",
} as const;

export type EPromoCampaignStatus = ValuesOf<typeof EPromoCampaignStatus>;

export const promoCampaignStatusOrder = {
  [EPromoCampaignStatus.PENDING]: 1,
  [EPromoCampaignStatus.ON_GOING]: 2,
  [EPromoCampaignStatus.COMPLETED]: 3,
  [EPromoCampaignStatus.TERMINATED]: 4,
} as const satisfies Record<EPromoCampaignStatus, number>;
