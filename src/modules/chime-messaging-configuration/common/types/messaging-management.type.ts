import { FindOptionsRelations, FindOptionsSelect } from "typeorm";
import { QueryResultType } from "src/common/types";
import { Channel } from "src/modules/chime-messaging-configuration/entities";
import { UserRole } from "src/modules/users/entities";

/**
 ** Query types
 */

export const JoinChannelQuery = {
  select: {
    id: true,
    operatedByCompanyId: true,
    status: true,
    channelArn: true,
    channelMemberships: {
      id: true,
      userRole: {
        id: true,
      },
    },
  } as const satisfies FindOptionsSelect<Channel>,
  relations: { channelMemberships: { userRole: true } } as const satisfies FindOptionsRelations<Channel>,
};
export type TJoinChannel = QueryResultType<Channel, typeof JoinChannelQuery.select>;

export const JoinChannelUserRoleQuery = {
  select: {
    id: true,
    operatedByCompanyId: true,
    instanceUserArn: true,
    profile: {
      id: true,
    },
    role: {
      id: true,
      name: true,
    },
  } as const satisfies FindOptionsSelect<UserRole>,
  relations: { profile: true, role: true } as const satisfies FindOptionsRelations<UserRole>,
};
export type TJoinChannelUserRole = QueryResultType<UserRole, typeof JoinChannelUserRoleQuery.select>;

export const UploadFileQuery = {
  select: {
    id: true,
    fileKeys: true,
  } as const satisfies FindOptionsSelect<Channel>,
};
export type TUploadFile = QueryResultType<Channel, typeof UploadFileQuery.select>;

export const DeleteOldChannelsQuery = {
  select: { id: true, channelArn: true, fileKeys: true } as const satisfies FindOptionsSelect<Channel>,
};
export type TDeleteOldChannels = QueryResultType<Channel, typeof DeleteOldChannelsQuery.select>;
