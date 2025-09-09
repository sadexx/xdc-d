import {
  allCorporateAdminRoles,
  allInterpreterRolesNotEditable,
  allLfhAdminRoles,
} from "src/modules/permissions/common/constants";
import { IMethodSeed } from "src/modules/permissions/common/interfaces";

export const appointmentsOrder: IMethodSeed = {
  "POST /v1/appointment-orders/command/accept/:id": {
    description: "01.01. Accept appointment order",
    roles: allInterpreterRolesNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/appointment-orders/command/accept/on-demand/:id": {
    description: "01.02. Accept on-demand appointment order",
    roles: allInterpreterRolesNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/appointment-orders/command/group/accept/:id": {
    description: "01.03. Accept appointment order group",
    roles: allInterpreterRolesNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "PATCH /v1/appointment-orders/command/reject/:id": {
    description: "01.04. Reject appointment order",
    roles: allInterpreterRolesNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "PATCH /v1/appointment-orders/command/group/reject/:id": {
    description: "01.05. Reject appointment order group",
    roles: allInterpreterRolesNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "DELETE /v1/appointment-orders/command/refuse/:id": {
    description: "01.06. Refuse appointment order",
    roles: allInterpreterRolesNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "DELETE /v1/appointment-orders/command/group/refuse/:id": {
    description: "01.07. Refuse appointment order group",
    roles: allInterpreterRolesNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/appointment-orders/command/send-repeat-notification-to-interpreters/:id": {
    description: "01.08. Send repeat notification to interpreters",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/appointment-orders/command/group/send-repeat-notification-to-interpreters/:platformId": {
    description: "01.09. Send repeat notification to interpreters",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/appointment-orders/command/add-interpreter-to-order/:id": {
    description: "01.10. Manually add interpreter to order",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/appointment-orders/command/group/add-interpreter-to-order-group/:platformId": {
    description: "01.11. Manually add interpreter to order group",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/appointment-orders/query/company": {
    description: "02.01. Get all orders by company.",
    roles: allCorporateAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/appointment-orders/query/matched": {
    description: "02.02. Get all matched orders",
    roles: {
      "super-admin": {
        isAllowed: true,
        isEditable: false,
      },
      "lfh-booking-officer": {
        isAllowed: true,
        isEditable: true,
      },
      "ind-professional-interpreter": {
        isAllowed: true,
      },
      "ind-language-buddy-interpreter": {
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
      "corporate-interpreting-providers-ind-interpreter": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/appointment-orders/query/rejected": {
    description: "02.03. Get all rejected orders",
    roles: {
      "super-admin": {
        isAllowed: true,
        isEditable: false,
      },
      "lfh-booking-officer": {
        isAllowed: true,
        isEditable: true,
      },
      "ind-professional-interpreter": {
        isAllowed: true,
      },
      "ind-language-buddy-interpreter": {
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
      "corporate-interpreting-providers-ind-interpreter": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/appointment-orders/query/:id": {
    description: "02.04. Get appointment order by id",
    roles: {
      "super-admin": {
        isAllowed: true,
        isEditable: false,
      },
      "lfh-booking-officer": {
        isAllowed: true,
        isEditable: true,
      },
      "ind-professional-interpreter": {
        isAllowed: true,
      },
      "ind-language-buddy-interpreter": {
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
      "corporate-interpreting-providers-ind-interpreter": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/appointment-orders/query/group/:id": {
    description: "02.05. Get appointment order group by id",
    roles: {
      "super-admin": {
        isAllowed: true,
        isEditable: false,
      },
      "lfh-booking-officer": {
        isAllowed: true,
        isEditable: true,
      },
      "ind-professional-interpreter": {
        isAllowed: true,
      },
      "ind-language-buddy-interpreter": {
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
      "corporate-interpreting-providers-ind-interpreter": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/appointment-orders/query/list-of-interpreters-received-order/:id": {
    description: "02.06. Get list of interpreters received order",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/appointment-orders/query/group/list-of-interpreters-received-order/:platformId": {
    description: "02.07. Get list of interpreters received order group",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
};
