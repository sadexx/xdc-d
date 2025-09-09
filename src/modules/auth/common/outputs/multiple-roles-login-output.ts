import { EUserRoleName } from "src/modules/users/common/enums";

export class MultipleRolesLoginOutput {
  availableRoles: EUserRoleName[];
  roleSelectionToken: string;
}
