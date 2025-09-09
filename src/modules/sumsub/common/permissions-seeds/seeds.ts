import { IMethodSeed } from "src/modules/permissions/common/interfaces";
import { allLfhAdminRoles, allRolesAllowedAndNotEditable } from "src/modules/permissions/common/constants";

export const sumsub: IMethodSeed = {
  "GET /v1/sumsub/access-token": {
    description: "01. Get access token",
    roles: {
      "ind-client": {
        isAllowed: true,
        isEditable: false,
      },
      "ind-professional-interpreter": {
        isAllowed: true,
        isEditable: false,
      },
      "ind-language-buddy-interpreter": {
        isAllowed: true,
        isEditable: false,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/sumsub/all-status-checks": {
    description: "02. Get all status checks",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/sumsub/user-status": {
    description: "03. Get user status",
    roles: {
      "super-admin": {
        isAllowed: true,
        isEditable: false,
      },
      "lfh-booking-officer": {
        isAllowed: true,
      },
      "ind-client": {
        isAllowed: true,
      },
      "ind-professional-interpreter": {
        isAllowed: true,
      },
      "ind-language-buddy-interpreter": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/sumsub/mock": {
    description: "04. Mock sumsub for current user",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: false,
  },
  "DELETE /v1/sumsub": {
    description: "06. Delete sumsub check",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
};
