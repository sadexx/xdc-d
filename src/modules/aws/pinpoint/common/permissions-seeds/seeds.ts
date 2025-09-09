import { IMethodSeed } from "src/modules/permissions/common/interfaces";
import { allRolesAllowedAndNotEditable } from "src/modules/permissions/common/constants";

export const awsPinpoint: IMethodSeed = {
  "GET /v1/phone-codes": {
    description: "01. Get phone codes",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
};
