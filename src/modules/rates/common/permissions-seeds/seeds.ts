import { IMethodSeed } from "src/modules/permissions/common/interfaces";
import { allLfhAdminRoles, allRolesAllowedAndNotEditable } from "src/modules/permissions/common/constants";

export const rates: IMethodSeed = {
  "POST /v1/rates/generate-rate-table": {
    description: "01. Generate rate table",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "PATCH /v1/rates/update-rate-table": {
    description: "02. Update rate table",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/rates/get-rate-table": {
    description: "03. Get rate table",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: false,
  },
  "POST /v1/rates/calculate-detailed-breakdown": {
    description: "04. Calculate detailed breakdown",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
};
