import { IMethodSeed } from "src/modules/permissions/common/interfaces";
import { allAdminRoles } from "src/modules/permissions/common/constants";

export const addresses: IMethodSeed = {
  "PATCH /v1/addresses/appointment/:id": {
    description: "Update appointment address by ID",
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
    isNotEditableForOtherRoles: true,
  },
};
