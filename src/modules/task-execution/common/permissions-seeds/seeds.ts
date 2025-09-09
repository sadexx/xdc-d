import { allRolesAllowedAndNotEditable } from "src/modules/permissions/common/constants";
import { IMethodSeed } from "src/modules/permissions/common/interfaces";

export const taskExecution: IMethodSeed = {
  "POST /v1/task-execution/batch-execute": {
    description: "01.01. Get task execution",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: true,
  },
};
