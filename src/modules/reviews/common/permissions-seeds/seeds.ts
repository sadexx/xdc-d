import { allLfhAdminRoles } from "src/modules/permissions/common/constants";
import { IMethodSeed } from "src/modules/permissions/common/interfaces";

export const reviews: IMethodSeed = {
  "POST /v1/reviews": {
    description: "01. Create review",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/reviews/:id": {
    description: "02. Get review by id",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "PATCH /v1/reviews/:id": {
    description: "03. Update review by id",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "DELETE /v1/reviews/:id": {
    description: "04. Delete review by id",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
};
