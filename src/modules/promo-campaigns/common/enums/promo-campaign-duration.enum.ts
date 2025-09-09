import { ValuesOf } from "src/common/types";

export const EPromoCampaignDuration = {
  ALWAYS: "always",
  LIMITED: "limited",
} as const;

export type EPromoCampaignDuration = ValuesOf<typeof EPromoCampaignDuration>;

export const promoCampaignDurationOrder = {
  [EPromoCampaignDuration.ALWAYS]: 1,
  [EPromoCampaignDuration.LIMITED]: 2,
} as const satisfies Record<EPromoCampaignDuration, number>;
