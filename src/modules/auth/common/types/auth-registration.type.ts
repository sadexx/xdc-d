import { FindOptionsSelect, FindOptionsRelations } from "typeorm";
import { QueryResultType } from "src/common/types";
import { User, UserRole } from "src/modules/users/entities";

/**
 ** Type
 */

export type TFinishRegistrationUserRole = TFinishRegistration["userRoles"][number];

export type TGetRegistrationStepsUserRole = TGetRegistrationSteps["userRoles"][number];

/**
 ** Query types
 */

export const GetRegistrationStepsQuery = {
  select: {
    id: true,
    phoneNumber: true,
    password: true,
    userRoles: { id: true, isUserAgreedToTermsAndConditions: true, role: { name: true } },
  } as const satisfies FindOptionsSelect<User>,
  relations: { userRoles: { role: true } } as const satisfies FindOptionsRelations<User>,
};
export type TGetRegistrationSteps = QueryResultType<User, typeof GetRegistrationStepsQuery.select>;

export const InitializeOrContinueUserRegistrationUserRoleQuery = {
  select: {
    id: true,
    userId: true,
    isUserAgreedToTermsAndConditions: true,
    user: {
      id: true,
      password: true,
      phoneNumber: true,
    },
  } as const satisfies FindOptionsSelect<UserRole>,
  relations: { user: true } as const satisfies FindOptionsRelations<UserRole>,
};
export type TInitializeOrContinueUserRegistrationUserRole = QueryResultType<
  UserRole,
  typeof InitializeOrContinueUserRegistrationUserRoleQuery.select
>;

export const StartSuperAdminRegistrationQuery = {
  select: { id: true } as const satisfies FindOptionsSelect<User>,
};
export type TStartSuperAdminRegistration = QueryResultType<User, typeof StartSuperAdminRegistrationQuery.select>;

export const FinishRegistrationQuery = {
  select: {
    id: true,
    isRegistrationFinished: true,
    email: true,
    isEmailVerified: true,
    password: true,
    phoneNumber: true,
    userRoles: {
      id: true,
      isActive: true,
      isRegistrationFinished: true,
      isUserAgreedToTermsAndConditions: true,
      isRequiredInfoFulfilled: true,
      role: { name: true },
      user: { id: true, email: true },
    },
    administratedCompany: { id: true },
  } as const satisfies FindOptionsSelect<User>,
  relations: {
    userRoles: { role: true, user: true },
    administratedCompany: true,
  } as const satisfies FindOptionsRelations<User>,
};
export type TFinishRegistration = QueryResultType<User, typeof FinishRegistrationQuery.select>;

export const VerifyRegistrationLinkQuery = {
  select: {
    id: true,
    invitationLinkCreationDate: true,
  } as const satisfies FindOptionsSelect<UserRole>,
};
export type TVerifyRegistrationLink = QueryResultType<UserRole, typeof VerifyRegistrationLinkQuery.select>;
