import { IMethodSeed } from "src/modules/permissions/common/interfaces";

export const settings: IMethodSeed = {
  "GET /v1/settings": {
    description: "01.01. Get settings",
    roles: {
      "super-admin": {
        isAllowed: true,
        isEditable: false,
      },
    },
    isNotEditableForOtherRoles: true,
  },

  "PATCH /v1/settings": {
    description: "01.01. Update settings",
    roles: {
      "super-admin": {
        isAllowed: true,
        isEditable: false,
      },
    },
    isNotEditableForOtherRoles: true,
  },
};
