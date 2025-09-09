import { EUserRoleName } from "src/modules/users/common/enums";
import { FindOptionsRelations, FindOptionsSelect } from "typeorm";
import { QueryResultType } from "src/common/types";
import { User, UserProfile, UserRole } from "src/modules/users/entities";

/**
 ** Type
 */

export type TRetrieveRequiredAndActivationSteps = {
  id?: string;
  role: EUserRoleName;
};

export type TFetchUserAndEvaluateRequiredAndActivationStepsUserRole =
  TFetchUserAndEvaluateRequiredAndActivationSteps["userRoles"][number];

export type TProcessAccountActivation = Pick<
  UserRole,
  "id" | "isRequiredInfoFulfilled" | "isActive" | "accountStatus" | "lastDeactivationDate"
> & {
  user: Pick<User, "email">;
  profile: Pick<UserProfile, "preferredName" | "firstName">;
};

/**
 ** Query types
 */

export const FetchUserAndEvaluateRequiredAndActivationStepsQuery = {
  select: {
    id: true,
    userRoles: {
      id: true,
      country: true,
      isRequiredInfoFulfilled: true,
      isActive: true,
      accountStatus: true,
      lastDeactivationDate: true,
      operatedByCompanyId: true,
      operatedByMainCorporateCompanyId: true,
      address: { id: true },
      profile: { id: true, contactEmail: true, firstName: true, preferredName: true, nativeLanguage: true },
      questionnaire: { id: true },
      sumSubCheck: { reviewAnswer: true },
      role: { name: true },
      paymentInformation: {
        stripeClientAccountId: true,
        stripeClientLastFour: true,
        stripeClientPaymentMethodId: true,
        stripeInterpreterOnboardingStatus: true,
        paypalPayerId: true,
      },
      ieltsCheck: { status: true },
      languageDocChecks: { status: true },
      docusignContracts: { docusignStatus: true },
      abnCheck: { abnStatus: true },
      rightToWorkChecks: { status: true },
      naatiProfile: { certifiedLanguages: true },
      backyCheck: { checkStatus: true, manualCheckResults: true },
      customInsurance: { insuredParty: true, insuranceCompany: true, policyNumber: true },
      userConcessionCard: { status: true },
      user: { email: true },
    },
  } as const satisfies FindOptionsSelect<User>,
};
export type TFetchUserAndEvaluateRequiredAndActivationSteps = QueryResultType<
  User,
  typeof FetchUserAndEvaluateRequiredAndActivationStepsQuery.select
>;

export const ActivateByAdminQuery = {
  select: {
    id: true,
    userId: true,
    role: { name: true },
  } as const satisfies FindOptionsSelect<UserRole>,
  relations: { role: true } as const satisfies FindOptionsRelations<UserRole>,
};
export type TActivateByAdmin = QueryResultType<UserRole, typeof ActivateByAdminQuery.select>;

export const DeactivateQuery = {
  select: {
    id: true,
    isActive: true,
    operatedByCompanyId: true,
    operatedByMainCorporateCompanyId: true,
    user: { email: true },
    profile: { preferredName: true, firstName: true },
  } as const satisfies FindOptionsSelect<UserRole>,
  relations: { user: true, profile: true } as const satisfies FindOptionsRelations<UserRole>,
};
export type TDeactivate = QueryResultType<UserRole, typeof DeactivateQuery.select>;
