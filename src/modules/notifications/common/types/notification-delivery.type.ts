import { FindOptionsSelect } from "typeorm";
import { QueryResultType } from "src/common/types";
import { Session } from "src/modules/sessions/entities";

/**
 ** Query types
 */

export const GetSessionForNotificationQuery = {
  select: {
    platform: true,
    deviceToken: true,
    iosVoipToken: true,
  } as const satisfies FindOptionsSelect<Session>,
};
export type TGetSessionForNotification = QueryResultType<Session, typeof GetSessionForNotificationQuery.select>;
