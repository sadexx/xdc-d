import { FindOptionsSelect, FindOptionsRelations } from "typeorm";
import { QueryResultType } from "src/common/types";
import { User } from "src/modules/users/entities";

/**
 ** Query types
 */

export const HandleThirdPartyAuthQuery = {
  select: {
    id: true,
    email: true,
    isRegistrationFinished: true,
    userRoles: {
      id: true,
      userId: true,
      isInDeleteWaiting: true,
      isRequiredInfoFulfilled: true,
      isActive: true,
      accountStatus: true,
      operatedByCompanyId: true,
      operatedByCompanyName: true,
      role: { name: true },
    },
  } as const satisfies FindOptionsSelect<User>,
  relations: { userRoles: { role: true } } as const satisfies FindOptionsRelations<User>,
};
export type THandleThirdPartyAuth = QueryResultType<User, typeof HandleThirdPartyAuthQuery.select>;
