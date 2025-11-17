import { FindOptionsRelations, FindOptionsSelect } from "typeorm";
import { QueryResultType } from "src/common/types";
import { Company } from "src/modules/companies/entities";
import { User } from "src/modules/users/entities";
import { Role, UserRole } from "src/modules/users/entities";

/**
 ** Type
 */

export type TRemoveCompany = Pick<Company, "id" | "removeAllAdminRoles" | "superAdminId"> & {
  superAdmin:
    | (Pick<User, "id"> & {
        userRoles: (Pick<UserRole, "id"> & { role: Pick<Role, "name"> })[];
      })
    | null;
};

/**
 ** Query types
 */

export const RemoveUserQuery = {
  select: {
    id: true,
    avatarUrl: true,
    isDefaultAvatar: true,
    avatar: {
      id: true,
      avatarUrl: true,
    },
    userRoles: {
      id: true,
    },
  } as const satisfies FindOptionsSelect<User>,
  relations: { avatar: true, userRoles: true } as const satisfies FindOptionsRelations<User>,
};
export type TRemoveUser = QueryResultType<User, typeof RemoveUserQuery.select>;

export const RemoveUserRoleQuery = {
  select: {
    id: true,
    documents: {
      id: true,
      s3Key: true,
    },
    interpreterProfile: {
      id: true,
      interpreterBadgePdf: true,
    },
  } as const satisfies FindOptionsSelect<UserRole>,
  relations: { documents: true, interpreterProfile: true } as const satisfies FindOptionsRelations<UserRole>,
};
export type TRemoveUserRole = QueryResultType<UserRole, typeof RemoveUserRoleQuery.select>;
