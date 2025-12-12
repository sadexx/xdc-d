import { allLfhAdminRoles } from "src/modules/permissions/common/constants";
import { IMethodSeed } from "src/modules/permissions/common/interfaces";

export const admin: IMethodSeed = {
  "GET /v1/admin/users": {
    description: "01. Get users list",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/admin/user-documents": {
    description: "02. Get user documents list",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/admin/user-profile/:id": {
    description: "03. Get user profile",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/admin/user-steps": {
    description: "04. Get user steps status",
    roles: {
      "super-admin": {
        isAllowed: true,
        isEditable: false,
      },
      "lfh-booking-officer": {
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
    },
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/admin/interpreter-profile": {
    description: "05. Get user interpreting profile",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/admin/payments": {
    description: "06. Get user payments",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "PATCH /v1/admin/payments/status/:id": {
    description: "07. Update payment status",
    roles: {
      "super-admin": {
        isAllowed: true,
        isEditable: false,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "PATCH /v1/admin/payments/invoiced": {
    description: "08. Mark payments invoiced",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/admin/payments/corporate-receipt": {
    description: "09. Generate corporate post payment receipt",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
};
