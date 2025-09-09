import { FindOptionsSelect } from "typeorm";
import { QueryResultType } from "src/common/types";
import { User } from "src/modules/users/entities";

/**
 ** Query types
 */

export const SendRequestToChangePasswordQuery = {
  select: {
    id: true,
    password: true,
    phoneNumber: true,
    email: true,
  } as const satisfies FindOptionsSelect<User>,
};
export type TSendRequestToChangePassword = QueryResultType<User, typeof SendRequestToChangePasswordQuery.select>;

export const VerifyPasswordResetCodeQuery = {
  select: {
    id: true,
    email: true,
  } as const satisfies FindOptionsSelect<User>,
};
export type TVerifyPasswordResetCode = QueryResultType<User, typeof VerifyPasswordResetCodeQuery.select>;
