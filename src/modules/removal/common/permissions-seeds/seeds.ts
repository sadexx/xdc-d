import { IMethodSeed } from "src/modules/permissions/common/interfaces";
import {
  allCorporateSuperAdminRolesNotEditable,
  allRolesAllowedAndNotEditable,
} from "src/modules/permissions/common/constants";

export const removal: IMethodSeed = {
  "DELETE /v1/removal/user/:id": {
    description: "01. Send remove user request",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: false,
  },
  "DELETE /v1/removal/role/:id": {
    description: "02. Send remove user role request",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: false,
  },
  "DELETE /v1/removal/company": {
    description: "03. Send remove company request",
    roles: {
      ...allCorporateSuperAdminRolesNotEditable,
      "super-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/removal/restore/user": {
    description: "03. Restore user or role by restoration key",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: false,
  },
  "POST /v1/removal/restore/company": {
    description: "04. Restore company",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
};
