import { ValuesOf } from "src/common/types";

export const ETokenName = {
  ACCESS_TOKEN: "accessToken",
  REFRESH_TOKEN: "refreshToken",
  EMAIL_CONFIRMATION_TOKEN: "emailConfirmationToken",
  REGISTRATION_TOKEN: "registrationToken",
  ROLE_SELECTION_TOKEN: "roleSelectionToken",
} as const;

export type ETokenName = ValuesOf<typeof ETokenName>;
