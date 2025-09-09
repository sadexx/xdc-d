import { IMethodSeed } from "src/modules/permissions/common/interfaces";
import { allAdminRoles } from "src/modules/permissions/common/constants";

export const blacklists: IMethodSeed = {
  "POST /v1/blacklists/:id": {
    description: "01. Create blacklist",
    roles: {
      "ind-client": {
        isAllowed: true,
      },
      "corporate-clients-ind-user": {
        isAllowed: true,
      },
      "corporate-interpreting-provider-corporate-clients-ind-user": {
        isAllowed: true,
      },
      "ind-professional-interpreter": {
        isAllowed: true,
      },
      "ind-language-buddy-interpreter": {
        isAllowed: true,
      },
      "corporate-interpreting-providers-ind-interpreter": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
  "PATCH /v1/blacklists/:id": {
    description: "02. Update blacklist",
    roles: allAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "DELETE /v1/blacklists/:id": {
    description: "03. Delete blacklist",
    roles: {
      "ind-client": {
        isAllowed: true,
      },
      "corporate-clients-ind-user": {
        isAllowed: true,
      },
      "corporate-interpreting-provider-corporate-clients-ind-user": {
        isAllowed: true,
      },
      "ind-professional-interpreter": {
        isAllowed: true,
      },
      "ind-language-buddy-interpreter": {
        isAllowed: true,
      },
      "corporate-interpreting-providers-ind-interpreter": {
        isAllowed: true,
      },
    },
    isNotEditableForOtherRoles: true,
  },
};
