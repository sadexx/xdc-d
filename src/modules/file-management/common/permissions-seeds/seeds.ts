import { IMethodSeed } from "src/modules/permissions/common/interfaces";
import { allLfhAdminRoles, allRolesAllowedAndNotEditable } from "src/modules/permissions/common/constants";

export const fileManagement: IMethodSeed = {
  "POST /v1/file-management/upload-terms": {
    description: "01. Upload terms",
    roles: allLfhAdminRoles,
    isNotEditableForOtherRoles: true,
  },
  "GET /v1/file-management/download-terms": {
    description: "02. Download terms",
    roles: allRolesAllowedAndNotEditable,
    isNotEditableForOtherRoles: false,
  },
};
