import { FindOptionsSelect } from "typeorm";
import { QueryResultType } from "src/common/types";
import { Session } from "src/modules/sessions/entities";

/**
 ** Query types
 */

export const GetLastSessionQuery = {
  select: {
    userRoleId: true,
    platform: true,
    deviceId: true,
    deviceToken: true,
    iosVoipToken: true,
    clientUserAgent: true,
    clientIPAddress: true,
  } as const satisfies FindOptionsSelect<Session>,
};
export type TGetLastSession = QueryResultType<Session, typeof GetLastSessionQuery.select>;

export const VerifySessionQuery = {
  select: { refreshToken: true, firstStageToken: true } as const satisfies FindOptionsSelect<Session>,
};
export type TVerifySession = QueryResultType<Session, typeof VerifySessionQuery.select>;

export const UpdateSessionQuery = {
  select: { id: true, refreshToken: true } as const satisfies FindOptionsSelect<Session>,
};
export type TUpdateSession = QueryResultType<Session, typeof UpdateSessionQuery.select>;

export const DeleteOldestSessionQuery = {
  select: { id: true } as const satisfies FindOptionsSelect<Session>,
};
export type TDeleteOldestSession = QueryResultType<Session, typeof DeleteOldestSessionQuery.select>;
