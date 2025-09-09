import { allLfhAdminRoles } from "src/modules/permissions/common/constants";
import { IMethodSeed } from "src/modules/permissions/common/interfaces";

export const memberships: IMethodSeed = {
  "GET /v1/memberships/admin": {
    description: "01. Get memberships for admin.",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/memberships/user": {
    description: "02. Get memberships for user.",
    roles: {
      "ind-client": {
        isAllowed: true,
        isEditable: false,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/memberships/status": {
    description: "03. Get status of user's membership.",
    roles: {
      "ind-client": {
        isAllowed: true,
        isEditable: false,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/memberships/subscription/:id": {
    description: "04. Subscribe to membership.",
    roles: {
      "ind-client": {
        isAllowed: true,
        isEditable: false,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/memberships/subscription-cancel": {
    description: "05. Cancel membership plan subscription.",
    roles: {
      "ind-client": {
        isAllowed: true,
        isEditable: false,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "PATCH /v1/memberships/:id": {
    description: "06. Update membership.",
    roles: {
      "super-admin": {
        isAllowed: true,
        isEditable: false,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "PATCH /v1/memberships/prices/:id": {
    description: "07. Update membership price.",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "PATCH /v1/memberships/activate/:id": {
    description: "08. Activate membership.",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "PATCH /v1/memberships/deactivate/:id": {
    description: "09. Deactivate membership.",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
};
