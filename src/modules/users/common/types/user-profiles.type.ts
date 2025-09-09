import { FindOptionsRelations, FindOptionsSelect } from "typeorm";
import { QueryResultType } from "src/common/types";
import { UserRole } from "src/modules/users/entities";

/**
 ** Queries types
 */

export const FindUserProfileUserRoleQuery = {
  select: {} as const satisfies FindOptionsSelect<UserRole>,
  relations: {
    user: { avatar: true },
    address: true,
    profile: true,
    role: true,
    discountHolder: {
      promoCampaignAssignment: { promoCampaign: true },
      membershipAssignment: { currentMembership: true },
    },
  } as const satisfies FindOptionsRelations<UserRole>,
};
export type TFindUserProfileUserRole = UserRole;

export const CreateUserProfileInformationQuery = {
  select: {
    id: true,
    operatedByCompanyId: true,
    operatedByMainCorporateCompanyId: true,
    address: { id: true },
    profile: { id: true },
    user: { id: true, email: true, isDefaultAvatar: true, administratedCompany: { id: true } },
  } as const satisfies FindOptionsSelect<UserRole>,
  relations: {
    address: true,
    profile: true,
    role: true,
    user: { administratedCompany: true },
  } as const satisfies FindOptionsRelations<UserRole>,
};
export type TCreateUserProfileInformation = QueryResultType<UserRole, typeof CreateUserProfileInformationQuery.select>;

export const UpdateUserProfileInformationQuery = {
  select: {
    id: true,
    operatedByCompanyId: true,
    operatedByMainCorporateCompanyId: true,
    accountStatus: true,
    country: true,
    timezone: true,
    isActive: true,
    userId: true,
    userConcessionCard: { status: true },
    sumSubCheck: { reviewAnswer: true },
    role: { name: true },
    rightToWorkChecks: { status: true },
    naatiProfile: { certifiedLanguages: true },
    backyCheck: { checkStatus: true, manualCheckResults: true },
    abnCheck: { abnStatus: true },
    ieltsCheck: { status: true },
    languageDocChecks: { status: true },
    address: { id: true },
    profile: { id: true },
    user: { id: true, email: true, isDefaultAvatar: true },
    interpreterProfile: { interpreterBadgePdf: true },
  } as const satisfies FindOptionsSelect<UserRole>,
  relations: {
    userConcessionCard: true,
    sumSubCheck: true,
    role: true,
    rightToWorkChecks: true,
    naatiProfile: true,
    backyCheck: true,
    abnCheck: true,
    ieltsCheck: true,
    languageDocChecks: true,
    address: true,
    profile: true,
    user: true,
    interpreterProfile: true,
  } as const satisfies FindOptionsRelations<UserRole>,
};
export type TUpdateUserProfileInformation = QueryResultType<UserRole, typeof UpdateUserProfileInformationQuery.select>;
