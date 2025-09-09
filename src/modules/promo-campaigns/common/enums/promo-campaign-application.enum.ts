import { ValuesOf } from "src/common/types";

export const EPromoCampaignApplication = {
  DAILY: "daily",
  NO_LIMITS: "no-limits",
} as const;

export type EPromoCampaignApplication = ValuesOf<typeof EPromoCampaignApplication>;

export const promoCampaignApplicationOrder = {
  [EPromoCampaignApplication.DAILY]: 1,
  [EPromoCampaignApplication.NO_LIMITS]: 2,
} as const satisfies Record<EPromoCampaignApplication, number>;
