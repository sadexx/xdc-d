import { TRolesPermissions } from "src/modules/permissions/common/types";

export interface IMethodSeed {
  [endpoint: string]: {
    description: string;
    roles: TRolesPermissions;
    isNotEditableForOtherRoles: boolean;
  };
}
