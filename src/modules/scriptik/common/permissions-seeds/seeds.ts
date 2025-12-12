import { IMethodSeed } from "src/modules/permissions/common/interfaces";

export const scriptik: IMethodSeed = {
  "POST /v1/scriptik/run": {
    description: "Run scriptik",
    roles: {
      "super-admin": {
        isAllowed: true,
        isEditable: false,
      },
    },
    isNotEditableForOtherRoles: true,
  },
};
