import { Expose } from "class-transformer";
import { ADMIN_ROLES } from "src/common/constants";

export class BlacklistOutput {
  @Expose()
  id: string;

  @Expose()
  blockedByUserRoleId: string;

  @Expose()
  blockedUserRoleId: string;

  @Expose({
    groups: [...ADMIN_ROLES],
  })
  isActive: boolean;

  @Expose()
  creationDate: Date;

  @Expose({
    groups: [...ADMIN_ROLES],
  })
  updatingDate: Date;
}
