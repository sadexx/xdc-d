import { IMethodSeed } from "src/modules/permissions/common/interfaces";
import { allRolesAllowedAndNotEditable } from "src/modules/permissions/common/constants";

export const webhook: IMethodSeed = {
  "GET /v1/webhook/manual-status-checks": {
    description: "01. Manual get webhooks",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
};
