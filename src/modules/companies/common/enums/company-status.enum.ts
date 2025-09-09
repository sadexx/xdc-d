import { ValuesOf } from "src/common/types";

export const ECompanyStatus = {
  NEW_REQUEST: "new-request",
  INVITATION_LINK_SENT: "invitation-link-was-sent",
  REGISTERED: "registered",
  UNDER_REVIEW: "under-review",
  ACTIVE: "active",
  DEACTIVATED: "deactivated",
} as const;

export type ECompanyStatus = ValuesOf<typeof ECompanyStatus>;

export const companyStatusOrder = {
  [ECompanyStatus.ACTIVE]: 1,
  [ECompanyStatus.NEW_REQUEST]: 2,
  [ECompanyStatus.REGISTERED]: 3,
  [ECompanyStatus.INVITATION_LINK_SENT]: 4,
  [ECompanyStatus.UNDER_REVIEW]: 5,
  [ECompanyStatus.DEACTIVATED]: 6,
} as const satisfies Record<ECompanyStatus, number>;
