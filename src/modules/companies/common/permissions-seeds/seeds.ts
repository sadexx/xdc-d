import { IMethodSeed } from "src/modules/permissions/common/interfaces";
import {
  allAdminRoles,
  allCorporateSuperAdminRolesNotEditable,
  allLfhAdminRoles,
  allRolesAllowedAndNotEditable,
} from "src/modules/permissions/common/constants";

export const companies: IMethodSeed = {
  "POST /v1/companies/create-company-registration-request": {
    description: "01.01. Create company registration request",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: false,
  },
  "PATCH /v1/companies/update-company-registration-request": {
    description: "01.02. Update company registration request",
    roles: {
      ...allLfhAdminRoles,
      "corporate-interpreting-providers-super-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/companies/create-company": {
    description: "01.03. Create company",
    roles: {
      ...allLfhAdminRoles,
      "corporate-interpreting-providers-super-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "DELETE /v1/companies/remove-company-registration-request": {
    description: "01.04. Remove company registration request",
    roles: {
      ...allLfhAdminRoles,
      "corporate-interpreting-providers-super-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "PATCH /v1/companies/update-company-sub-status": {
    description: "01.05. Update company sub status",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/companies/send-super-admin-invitation-link": {
    description: "01.06. Send invitation link to company super admin",
    roles: {
      ...allLfhAdminRoles,
      "corporate-interpreting-providers-super-admin": {
        isAllowed: true,
      },
      "corporate-interpreting-providers-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/companies": {
    description: "01.07. Get companies list",
    roles: {
      ...allLfhAdminRoles,
      "corporate-interpreting-providers-super-admin": {
        isAllowed: true,
      },
      "corporate-interpreting-providers-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/companies/my-company": {
    description: "01.08. Get company of current user",
    roles: allAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/companies/get-by-id/:id": {
    description: "01.09. Get company by id",
    roles: {
      ...allLfhAdminRoles,
      "corporate-interpreting-providers-super-admin": {
        isAllowed: true,
      },
      "corporate-interpreting-providers-admin": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "PATCH /v1/companies/update-company-profile": {
    description: "01.10. Update company profile",
    roles: allAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/companies/get-super-admin-by-company-id/:id": {
    description: "01.11. Get company super-admin by company id",
    roles: allCorporateSuperAdminRolesNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/companies/documents/upload": {
    description: "02.01. Upload company document",
    roles: allAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "PATCH /v1/companies/documents/approve": {
    description: "02.02. Approve company document",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "DELETE /v1/companies/documents/remove": {
    description: "02.03. Remove company document",
    roles: allAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/companies/documents/all": {
    description: "02.04. Get all company documents",
    roles: allAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/companies/documents/:id": {
    description: "02.05. Get company document by id",
    roles: allAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/companies/employee/create": {
    description: "03.01. Create company employee",
    roles: allAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/companies/employee/resend-invitation-link": {
    description: "03.02. Resend invitation link to company employee",
    roles: allAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/companies/employee": {
    description: "03.03. Get all company employees",
    roles: allAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/companies/employee/get-by-id/:id": {
    description: "03.04. Get company employee by id",
    roles: allAdminRoles,
    isNotEditableForOtherRoles: true,
  },
};
