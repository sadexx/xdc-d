import { ValuesOf } from "src/common/types";

export const ERegistrableUserRoleName = {
  IND_CLIENT: "ind-client",
  IND_PROFESSIONAL_INTERPRETER: "ind-professional-interpreter",
  IND_LANGUAGE_BUDDY_INTERPRETER: "ind-language-buddy-interpreter",
  INVITED_GUEST: "invited guest",
} as const;

export type ERegistrableUserRoleName = ValuesOf<typeof ERegistrableUserRoleName>;
