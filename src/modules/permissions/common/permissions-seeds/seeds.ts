import { IMethodSeed } from "src/modules/permissions/common/interfaces";

export const permissions: IMethodSeed = {
  "GET /v1/permissions": {
    description: "01. Get permissions by role",
    roles: {
      "super-admin": {
        isAllowed: true,
        isEditable: false,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "PATCH /v1/permissions/edit-one": {
    description: "02. Edit permission by id",
    roles: {
      "super-admin": {
        isAllowed: true,
        isEditable: false,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "PATCH /v1/permissions/edit-by-module": {
    description: "03. Edit permissions by module",
    roles: {
      "super-admin": {
        isAllowed: true,
        isEditable: false,
      },
    },
    isNotEditableForOtherRoles: false,
  },
};
