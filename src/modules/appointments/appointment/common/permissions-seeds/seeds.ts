import {
  allAdminRoles,
  allClientRolesNotEditable,
  allInterpreterRolesNotEditable,
} from "src/modules/permissions/common/constants";
import { IMethodSeed } from "src/modules/permissions/common/interfaces";

export const appointments: IMethodSeed = {
  "POST /v1/appointments/commands/virtual": {
    description: "01.01. Create virtual appointment",
    roles: allClientRolesNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/appointments/commands/face-to-face": {
    description: "01.02. Create face-to-face appointment",
    roles: allClientRolesNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "PATCH /v1/appointments/commands/:id": {
    description: "01.03. Update appointment",
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
    isNotEditableForOtherRoles: false,
  },
  "DELETE /v1/appointments/commands/:id": {
    description: "01.04. Delete appointment",
    roles: allClientRolesNotEditable,
    isNotEditableForOtherRoles: false,
  },
  "PATCH /v1/appointments/commands/archive/:id": {
    description: "01.05. Archive appointment",
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
    isNotEditableForOtherRoles: false,
  },
  "POST /v1/appointments/commands/late-notification/:id": {
    description: "01.06. Send late notification",
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
    isNotEditableForOtherRoles: false,
  },
  "PATCH /v1/appointments/commands/external-interpreter-found/:id": {
    description: "01.07. External interpreter found",
    roles: allAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "PATCH /v1/appointments/commands/cancel/:id": {
    description: "01.08. Cancel appointment",
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
  "PATCH /v1/appointments/commands/cancel/group/:platformId": {
    description: "01.09. Cancel group appointments",
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
  "PATCH /v1/appointments/commands/search-conditions/:id": {
    description: "01.10. Set suggested search conditions",
    roles: allClientRolesNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "PATCH /v1/appointments/commands/business-time/:id": {
    description: "01.11. Set appointment business time",
    roles: allClientRolesNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "PATCH /v1/appointments/commands/rate-by-client/:id": {
    description: "01.12. Rate appointment by client",
    roles: allClientRolesNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "PATCH /v1/appointments/commands/rate-by-interpreter/:id": {
    description: "01.13. Rate appointment by interpreter",
    roles: allInterpreterRolesNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "PATCH /v1/appointments/commands/rate/interpreter/exclude-toggle/:id": {
    description: "01.14. Exclude/include interpreter rating",
    roles: allAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "PATCH /v1/appointments/commands/external-session/:id": {
    description: "01.16. Check in or check out external appointment",
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
  "GET /v1/appointments/query/my-list": {
    description: "02.01. Get my appointments",
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
  "GET /v1/appointments/query/archived": {
    description: "02.02. Get archived appointments",
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
  "GET /v1/appointments/query/:id": {
    description: "02.03. Get appointment by id",
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
  "GET /v1/appointments/query/group/ids": {
    description: "02.04. Get appointment group ids",
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
  "GET /v1/appointments/query/group/:platformId": {
    description: "02.05. Get appointments by group id",
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
};
