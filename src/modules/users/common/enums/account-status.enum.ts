import { ValuesOf } from "src/common/types";

export const EAccountStatus = {
  ACTIVE: "active",
  INVITATION_LINK: "invitation-link",
  DEACTIVATED: "deactivated",
  REGISTERED: "registered",
  START_REGISTRATION: "start-registration",
} as const;

export type EAccountStatus = ValuesOf<typeof EAccountStatus>;

export const accountStatusOrder = {
  [EAccountStatus.ACTIVE]: 1,
  [EAccountStatus.REGISTERED]: 2,
  [EAccountStatus.START_REGISTRATION]: 3,
  [EAccountStatus.INVITATION_LINK]: 4,
  [EAccountStatus.DEACTIVATED]: 5,
} as const satisfies Record<EAccountStatus, number>;
