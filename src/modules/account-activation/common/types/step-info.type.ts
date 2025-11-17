import { FindOptionsSelect, FindOptionsRelations } from "typeorm";
import { QueryResultType } from "src/common/types";
import { Role, UserProfile, UserRole } from "src/modules/users/entities";
import { Address } from "src/modules/addresses/entities";
import { InterpreterQuestionnaire } from "src/modules/interpreters/questionnaire/entities";
import { SumSubCheck } from "src/modules/sumsub/entities";
import { PaymentInformation } from "src/modules/payment-information/entities";
import { IeltsCheck } from "src/modules/ielts/entities";
import { LanguageDocCheck } from "src/modules/language-doc-check/entities";
import { DocusignContract } from "src/modules/docusign/entities";
import { AbnCheck } from "src/modules/abn/entities";
import { RightToWorkCheck } from "src/modules/right-to-work-check/entities";
import { NaatiProfile } from "src/modules/naati/entities";
import { BackyCheck } from "src/modules/backy-check/entities";
import { CustomInsurance } from "src/modules/interpreters/profile/entities";
import { UserConcessionCard } from "src/modules/concession-card/entities";

/**
 ** Type
 */

export type TMapProfileInformationStatus = Pick<UserRole, "id"> & {
  address: Pick<Address, "id"> | null;
  profile: Pick<UserProfile, "id" | "contactEmail" | "nativeLanguage"> | null;
  role: Pick<Role, "name">;
};

export type TMapQuestionnaireStatus = Pick<InterpreterQuestionnaire, "id">;

export type TMapSumSubVerificationStatus = Pick<SumSubCheck, "reviewAnswer">;

export type TMapPaymentInformationStatus = Pick<
  PaymentInformation,
  | "stripeClientPaymentMethodId"
  | "stripeClientAccountId"
  | "stripeClientLastFour"
  | "paypalPayerId"
  | "stripeInterpreterOnboardingStatus"
>;

export type TMapIeltsCheckStatus = Pick<IeltsCheck, "status">;

export type TMapLanguageDocCheckStatus = Pick<LanguageDocCheck, "status">;

export type TMapRightToWorkAsLanguageBuddyCheckStatus = Pick<UserRole, "id"> & {
  ieltsCheck: TMapIeltsCheckStatus | null;
  languageDocChecks: TMapLanguageDocCheckStatus[];
};

export type TMapDocusignContractStatus = Pick<DocusignContract, "docusignStatus">;

export type TMapAbnVerificationStatus = Pick<AbnCheck, "abnStatus">;

export type TMapRightToWorkCheckStatus = Pick<RightToWorkCheck, "status">;

export type TMapNaatiVerificationStatus = Pick<NaatiProfile, "certifiedLanguages">;

export type TMapBackyCheckStatus = Pick<BackyCheck, "checkStatus" | "manualCheckResults">;

export type TMapCustomInsuranceStatus = Pick<CustomInsurance, "insuredParty" | "insuranceCompany" | "policyNumber">;

export type TMapConcessionCardStatus = Pick<UserConcessionCard, "status">;

/**
 ** Query types
 */

export const GetCountryByUserIdAndRoleNameQuery = {
  select: {
    id: true,
    country: true,
    address: { country: true },
  } as const satisfies FindOptionsSelect<UserRole>,
  relations: { address: true } as const satisfies FindOptionsRelations<UserRole>,
};
export type TGetCountryByUserIdAndRoleName = QueryResultType<
  UserRole,
  typeof GetCountryByUserIdAndRoleNameQuery.select
>;
