import { FindOptionsRelations, FindOptionsSelect } from "typeorm";
import { QueryResultType } from "src/common/types";
import { User, UserRole } from "src/modules/users/entities";

/**
 ** Query types
 */

export const StartRegistrationQuery = {
  select: { id: true, userRoles: { isRegistrationFinished: true } } as const satisfies FindOptionsSelect<User>,
  relations: { userRoles: true } as const satisfies FindOptionsRelations<User>,
};
export type TStartRegistration = QueryResultType<User, typeof StartRegistrationQuery.select>;

export const VerifyEmailQuery = {
  select: {
    id: true,
    userRoles: {
      id: true,
      role: {
        id: true,
        name: true,
      },
    },
  } as const satisfies FindOptionsSelect<User>,
  relations: { userRoles: { role: true } } as const satisfies FindOptionsRelations<User>,
};
export type TVerifyEmail = QueryResultType<User, typeof VerifyEmailQuery.select>;

export const CreatePasswordQuery = {
  select: {
    id: true,
    password: true,
  } as const satisfies FindOptionsSelect<User>,
};
export type TCreatePassword = QueryResultType<User, typeof CreatePasswordQuery.select>;

export const ValidatePhoneNumberAvailabilityQuery = {
  select: {
    email: true,
  } as const satisfies FindOptionsSelect<User>,
};
export type TValidatePhoneNumberAvailability = QueryResultType<
  User,
  typeof ValidatePhoneNumberAvailabilityQuery.select
>;

export const AgreeToConditionsQuery = {
  select: {
    id: true,
    isUserAgreedToTermsAndConditions: true,
  } as const satisfies FindOptionsSelect<UserRole>,
};
export type TAgreeToConditions = QueryResultType<UserRole, typeof AgreeToConditionsQuery.select>;
