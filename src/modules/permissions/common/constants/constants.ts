import { TRolesPermissions } from "src/modules/permissions/common/types";

export const allRolesAllowedAndNotEditable: TRolesPermissions = {
  "super-admin": {
    isAllowed: true,
    isEditable: false,
  },
  "lfh-booking-officer": {
    isAllowed: true,
    isEditable: false,
  },
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
  "invited-guest": {
    isAllowed: true,
    isEditable: false,
  },
  "corporate-clients-super-admin": {
    isAllowed: true,
    isEditable: false,
  },
  "corporate-clients-admin": {
    isAllowed: true,
    isEditable: false,
  },
  "corporate-clients-receptionist": {
    isAllowed: true,
    isEditable: false,
  },
  "corporate-clients-ind-user": {
    isAllowed: true,
    isEditable: false,
  },
  "corporate-interpreting-providers-super-admin": {
    isAllowed: true,
    isEditable: false,
  },
  "corporate-interpreting-providers-admin": {
    isAllowed: true,
    isEditable: false,
  },
  "corporate-interpreting-providers-receptionist": {
    isAllowed: true,
    isEditable: false,
  },
  "corporate-interpreting-providers-ind-interpreter": {
    isAllowed: true,
    isEditable: false,
  },
  "corporate-interpreting-provider-corporate-clients-super-admin": {
    isAllowed: true,
    isEditable: false,
  },
  "corporate-interpreting-provider-corporate-clients-admin": {
    isAllowed: true,
    isEditable: false,
  },
  "corporate-interpreting-provider-corporate-clients-receptionist": {
    isAllowed: true,
    isEditable: false,
  },
  "corporate-interpreting-provider-corporate-clients-ind-user": {
    isAllowed: true,
    isEditable: false,
  },
};

export const allLfhAdminRoles: TRolesPermissions = {
  "super-admin": {
    isAllowed: true,
    isEditable: false,
  },
  "lfh-booking-officer": {
    isAllowed: true,
  },
};

export const allCorporateAdminRoles: TRolesPermissions = {
  "corporate-clients-super-admin": {
    isAllowed: true,
  },
  "corporate-clients-admin": {
    isAllowed: true,
  },
  "corporate-clients-receptionist": {
    isAllowed: true,
  },
  "corporate-interpreting-providers-super-admin": {
    isAllowed: true,
  },
  "corporate-interpreting-providers-admin": {
    isAllowed: true,
  },
  "corporate-interpreting-providers-receptionist": {
    isAllowed: true,
  },
  "corporate-interpreting-provider-corporate-clients-super-admin": {
    isAllowed: true,
  },
  "corporate-interpreting-provider-corporate-clients-admin": {
    isAllowed: true,
  },
  "corporate-interpreting-provider-corporate-clients-receptionist": {
    isAllowed: true,
  },
};

export const allAdminRoles: TRolesPermissions = {
  ...allLfhAdminRoles,
  ...allCorporateAdminRoles,
};

export const allCorporateSuperAdminRolesNotEditable: TRolesPermissions = {
  "corporate-clients-super-admin": {
    isAllowed: true,
    isEditable: false,
  },
  "corporate-interpreting-providers-super-admin": {
    isAllowed: true,
    isEditable: false,
  },
  "corporate-interpreting-provider-corporate-clients-super-admin": {
    isAllowed: true,
    isEditable: false,
  },
};

export const allInterpreterRolesNotEditable: TRolesPermissions = {
  "ind-professional-interpreter": {
    isAllowed: true,
    isEditable: false,
  },
  "ind-language-buddy-interpreter": {
    isAllowed: true,
    isEditable: false,
  },
  "corporate-interpreting-providers-ind-interpreter": {
    isAllowed: true,
    isEditable: false,
  },
};

export const allClientRolesNotEditable: TRolesPermissions = {
  "ind-client": {
    isAllowed: true,
    isEditable: false,
  },
  "corporate-clients-ind-user": {
    isAllowed: true,
    isEditable: false,
  },
  "corporate-interpreting-provider-corporate-clients-ind-user": {
    isAllowed: true,
    isEditable: false,
  },
};

export const ENDPOINTS_WITHOUT_SEEDS: readonly string[] = [
  "GET /v1/health-check",
  "POST /v1/developer/register-lfh-super-admin",
  "POST /v1/developer/create-company",
  "GET /v1/payments/download-receipt",
  "POST /v1/rates/calculate-preliminary-estimate",
  "GET /v1/payment-information/mock-payment-info",
  "POST /v1/task-execution/batch-execute",
];
