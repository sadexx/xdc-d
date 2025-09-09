import { IMethodSeed } from "src/modules/permissions/common/interfaces";
import { allRolesAllowedAndNotEditable } from "src/modules/permissions/common/constants";

export const urlShortener: IMethodSeed = {
  "GET /v1/lnk/:shortCode": {
    description: "01. Redirects to the original destination URL associated with the given short code.",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: false,
  },
};
