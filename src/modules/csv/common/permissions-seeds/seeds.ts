import { allAdminRoles, allLfhAdminRoles } from "src/modules/permissions/common/constants";
import { IMethodSeed } from "src/modules/permissions/common/interfaces";

export const csv: IMethodSeed = {
  "GET /v1/csv/download/appointments": {
    description: "01. Export appointments csv.",
    roles: {
      ...allAdminRoles,
      "ind-client": {
        isAllowed: true,
      },
      "corporate-clients-ind-user": {
        isAllowed: true,
      },
      "corporate-interpreting-provider-corporate-clients-ind-user": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/csv/download/appointments/archived": {
    description: "02. Export archived appointments csv.",
    roles: {
      "ind-client": {
        isAllowed: true,
      },
      "corporate-clients-ind-user": {
        isAllowed: true,
      },
      "corporate-interpreting-provider-corporate-clients-ind-user": {
        isAllowed: true,
      },
      "ind-professional-interpreter": {
        isAllowed: true,
      },
      "ind-language-buddy-interpreter": {
        isAllowed: true,
      },
      "corporate-interpreting-providers-ind-interpreter": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/csv/download/appointments/draft": {
    description: "03. Export draft appointments csv.",
    roles: {
      ...allAdminRoles,
      "ind-client": {
        isAllowed: true,
      },
      "corporate-clients-ind-user": {
        isAllowed: true,
      },
      "corporate-interpreting-provider-corporate-clients-ind-user": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/csv/download/users": {
    description: "04. Export users csv.",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/csv/download/companies": {
    description: "05. Export companies csv.",
    roles: allAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/csv/download/employees": {
    description: "06. Export employees csv.",
    roles: allAdminRoles,
    isNotEditableForOtherRoles: true,
  },
};
