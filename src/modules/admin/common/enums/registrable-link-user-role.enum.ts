import { ValuesOf } from "src/common/types";

export const ERegistrableLinkUserRoleName = {
  IND_CLIENT: "ind-client",
  IND_PROFESSIONAL_INTERPRETER: "ind-professional-interpreter",
  IND_LANGUAGE_BUDDY_INTERPRETER: "ind-language-buddy-interpreter",
  INVITED_GUEST: "invited guest",
  LFH_BOOKING_OFFICER: "lfh-booking-officer",
} as const;

export type ERegistrableLinkUserRoleName = ValuesOf<typeof ERegistrableLinkUserRoleName>;
