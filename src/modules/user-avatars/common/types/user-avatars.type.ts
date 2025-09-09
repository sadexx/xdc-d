import { FindOptionsSelect, FindOptionsRelations } from "typeorm";
import { QueryResultType } from "src/common/types";
import { UserAvatarRequest } from "src/modules/user-avatars/entities";
import { User, UserRole } from "src/modules/users/entities";
import { InterpreterProfile } from "src/modules/interpreters/profile/entities";

/**
 ** Type
 */

export type TProcessUserAvatarRequest = Pick<UserRole, "id"> & {
  interpreterProfile: Pick<InterpreterProfile, "interpreterBadgePdf"> | null;
};

/**
 ** Query types
 */

export const GetAvatarRequestByUserIdQuery = {
  select: {} as const satisfies FindOptionsSelect<UserAvatarRequest>,
};
export type TGetAvatarRequestByUserId = QueryResultType<UserAvatarRequest, typeof GetAvatarRequestByUserIdQuery.select>;

export const HandleAdminAvatarUploadQuery = {
  select: {
    isDefaultAvatar: true,
    avatarUrl: true,
  } as const satisfies FindOptionsSelect<User>,
};
export type THandleAdminAvatarUpload = QueryResultType<User, typeof HandleAdminAvatarUploadQuery.select>;

export const HandleUserAvatarUploadQuery = {
  select: {
    id: true,
    avatarUrl: true,
  } as const satisfies FindOptionsSelect<UserAvatarRequest>,
};
export type THandleUserAvatarUpload = QueryResultType<UserAvatarRequest, typeof HandleUserAvatarUploadQuery.select>;

export const HandleUserAvatarUploadUserQuery = {
  select: {
    id: true,
    platformId: true,
  } as const satisfies FindOptionsSelect<User>,
};
export type THandleUserAvatarUploadUser = QueryResultType<User, typeof HandleUserAvatarUploadUserQuery.select>;

export const UserAvatarManualDecisionQuery = {
  select: {
    id: true,
    avatarUrl: true,
    user: {
      id: true,
      isDefaultAvatar: true,
      avatarUrl: true,
      userRoles: { id: true, interpreterProfile: { interpreterBadgePdf: true } },
    },
  } as const satisfies FindOptionsSelect<UserAvatarRequest>,
  relations: {
    user: { userRoles: { interpreterProfile: true } },
  } as const satisfies FindOptionsRelations<UserAvatarRequest>,
};
export type TUserAvatarManualDecision = QueryResultType<UserAvatarRequest, typeof UserAvatarManualDecisionQuery.select>;

export const RemoveAvatarQuery = {
  select: {
    id: true,
    user: { isDefaultAvatar: true, avatarUrl: true },
    profile: { gender: true },
    interpreterProfile: { interpreterBadgePdf: true },
  } as const satisfies FindOptionsSelect<UserRole>,
  relations: { user: true, profile: true, interpreterProfile: true } as const satisfies FindOptionsRelations<UserRole>,
};
export type TRemoveAvatar = QueryResultType<UserRole, typeof RemoveAvatarQuery.select>;
