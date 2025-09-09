import { allRolesAllowedAndNotEditable } from "src/modules/permissions/common/constants";
import { IMethodSeed } from "src/modules/permissions/common/interfaces";

export const notifications: IMethodSeed = {
  "GET /v1/notifications": {
    description: "01. Get all notifications",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },

  "DELETE /v1/notifications/:id": {
    description: "01. Delete notification",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
};
