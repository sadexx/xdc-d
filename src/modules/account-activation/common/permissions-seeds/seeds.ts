import { IMethodSeed } from "src/modules/permissions/common/interfaces";
import { allAdminRoles, allRolesAllowedAndNotEditable } from "src/modules/permissions/common/constants";

export const accountActivation: IMethodSeed = {
  "GET /v1/users/me/account-activation-steps": {
    description: "01.01. Get individual account activation steps",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: false,
  },
  "POST /v1/users/me/account-activation": {
    description: "01.02. Manual first account activation",
    roles: {
      "super-admin": {
        isAllowed: true,
        isEditable: false,
      },
      "lfh-booking-officer": {
        isAllowed: true,
        isEditable: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/users/deactivate": {
    description: "01.03. Account deactivation",
    roles: allAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/users/activate-by-admin": {
    description: "01.04. Account activation (only after deactivation)",
    roles: allAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/company/activation-steps": {
    description: "02.01. Get company activation steps",
    roles: {
      "super-admin": {
        isAllowed: true,
        isEditable: false,
      },
      "lfh-booking-officer": {
        isAllowed: true,
      },
      "corporate-clients-super-admin": {
        isAllowed: true,
      },
      "corporate-clients-admin": {
        isAllowed: true,
      },
      "corporate-interpreting-providers-super-admin": {
        isAllowed: true,
      },
      "corporate-interpreting-providers-admin": {
        isAllowed: true,
      },
      "corporate-interpreting-provider-corporate-clients-super-admin": {
        isAllowed: true,
      },
      "corporate-interpreting-provider-corporate-clients-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: false,
  },
  "POST /v1/company/activate": {
    description: "02.02. Company (re)activation",
    roles: {
      "super-admin": {
        isAllowed: true,
        isEditable: false,
      },
      "lfh-booking-officer": {
        isAllowed: false,
        isEditable: true,
      },
      "corporate-interpreting-providers-super-admin": {
        isAllowed: true,
        isEditable: false,
      },
      "corporate-interpreting-providers-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/company/deactivate": {
    description: "02.03. Company deactivation",
    roles: {
      "super-admin": {
        isAllowed: true,
        isEditable: false,
      },
      "lfh-booking-officer": {
        isAllowed: false,
        isEditable: true,
      },
      "corporate-interpreting-providers-super-admin": {
        isAllowed: true,
        isEditable: false,
      },
      "corporate-interpreting-providers-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
};
