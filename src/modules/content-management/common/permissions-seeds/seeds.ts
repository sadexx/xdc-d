import { IMethodSeed } from "src/modules/permissions/common/interfaces";
import { allLfhAdminRoles, allRolesAllowedAndNotEditable } from "src/modules/permissions/common/constants";

export const contentManagement: IMethodSeed = {
  "POST /v1/content-management/promo": {
    description: "01. Create promo",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/content-management/promo/:id": {
    description: "02. Get promo by id",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "PATCH /v1/content-management/promo": {
    description: "03. Update promo by id",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "DELETE /v1/content-management/promo": {
    description: "04. Delete promo by id",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/content-management": {
    description: "05. Get content management by language",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
  "PATCH /v1/content-management": {
    description: "06. Update content management by language",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "POST /v1/content-management/image": {
    description: "07. Save image",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
};
