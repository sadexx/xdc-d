import { IMethodSeed } from "src/modules/permissions/common/interfaces";
import { allRolesAllowedAndNotEditable } from "src/modules/permissions/common/constants";

export const uiLanguages: IMethodSeed = {
  "GET /v1/ui-languages": {
    description: "01. Get supported languages",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: false,
  },
  "GET /v1/ui-languages/json/:language": {
    description: "02. Find language file",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: false,
  },
  "POST /v1/ui-languages/json/:language": {
    description: "03. Update language file",
    roles: {
      "super-admin": {
        isAllowed: true,
        isEditable: false,
      },
      "lfh-booking-officer": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
};
