import { ValuesOf } from "src/common/types";

export const EChannelMembershipType = {
  MEMBER: "member",
  MODERATOR: "moderator",
} as const;

export type EChannelMembershipType = ValuesOf<typeof EChannelMembershipType>;
