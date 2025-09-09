import { allInterpreterRolesNotEditable } from "src/modules/permissions/common/constants";
import { IMethodSeed } from "src/modules/permissions/common/interfaces";

export const interpreterBadge: IMethodSeed = {
  "PATCH /v1/interpreter-profile/badge": {
    description: "01. Create or update interpreter badge.",
    roles: allInterpreterRolesNotEditable,
    isNotEditableForOtherRoles: true,
  },
};
