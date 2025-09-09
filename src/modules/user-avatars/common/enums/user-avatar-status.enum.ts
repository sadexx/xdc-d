import { ValuesOf } from "src/common/types";

export const EAvatarStatus = {
  UNDER_REVIEW: "under-review",
  VERIFIED: "verified",
  DECLINED: "declined",
} as const;

export type EAvatarStatus = ValuesOf<typeof EAvatarStatus>;
