import { QueryResultType } from "src/common/types";
import { UserRole } from "src/modules/users/entities";
import { FindOptionsRelations, FindOptionsSelect } from "typeorm";

export const UserInInternalNaatiDatabaseQuery = {
  select: {
    id: true,
    isActive: true,
    role: { id: true, name: true },
    profile: { firstName: true, lastName: true },
    user: { id: true, email: true },
  } as const satisfies FindOptionsSelect<UserRole>,
  relations: { role: true, profile: true, user: true } as const satisfies FindOptionsRelations<UserRole>,
};
export type TUserInInternalNaatiDatabase = QueryResultType<UserRole, typeof UserInInternalNaatiDatabaseQuery.select>;

export const VerificationNaatiCpnNumberQuery = {
  select: {
    id: true,
    userId: true,
    isActive: true,
    role: { id: true, name: true },
    profile: { firstName: true, lastName: true },
    user: { id: true, email: true },
  } as const satisfies FindOptionsSelect<UserRole>,
  relations: { role: true, profile: true, user: true } as const satisfies FindOptionsRelations<UserRole>,
};
export type TVerificationNaatiCpnNumber = QueryResultType<UserRole, typeof VerificationNaatiCpnNumberQuery.select>;
