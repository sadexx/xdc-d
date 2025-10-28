import { BadRequestException, Injectable } from "@nestjs/common";
import { UpdateUserProfileDto } from "src/modules/users/common/dto";
import { TUpdateUserProfileInformation } from "src/modules/users/common/types";
import { EUserConcessionCardStatus } from "src/modules/concession-card/common/enums";
import { EExtSumSubReviewAnswer } from "src/modules/sumsub/common/enums";
import { UNDEFINED_VALUE } from "src/common/constants";
import { EExtCheckStatus, EManualCheckResult } from "src/modules/backy-check/common/enums";
import { EExtAbnStatus } from "src/modules/abn/common/enums";
import { EIeltsStatus } from "src/modules/ielts/common/enums";
import { ELanguageDocCheckRequestStatus } from "src/modules/language-doc-check/common/enums";
import { ERightToWorkCheckStatus } from "src/modules/right-to-work-check/common/enums";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { AccessControlService } from "src/modules/access-control/services";
import { EUsersErrorCodes } from "src/modules/users/common/enums";

@Injectable()
export class UserProfileUpdatePolicyService {
  constructor(private readonly accessControlService: AccessControlService) {}

  /**
   ** User Profile Update Policy Validation
   **/

  public async validateUpdateUserProfileInformation(
    dto: UpdateUserProfileDto,
    user: ITokenUserData,
    userRole: TUpdateUserProfileInformation,
  ): Promise<void> {
    await this.accessControlService.authorizeUserRoleForOperation(user, userRole);

    if (this.isNameChangeRestricted(dto, userRole)) {
      throw new BadRequestException(EUsersErrorCodes.NAME_CHANGE_RESTRICTED_VERIFIED_DOCUMENTS);
    }

    if (this.isTimezoneRequiredButMissing(dto)) {
      throw new BadRequestException(EUsersErrorCodes.TIMEZONE_REQUIRED);
    }

    if (this.isNameChangeRestrictedByVerifiedDocuments(dto, userRole)) {
      throw new BadRequestException(EUsersErrorCodes.NAME_CHANGE_RESTRICTED_PROFESSIONAL_DOCUMENTS);
    }

    if (this.isEmailChangeRestrictedByBackgroundCheck(dto, userRole)) {
      throw new BadRequestException(EUsersErrorCodes.EMAIL_CHANGE_RESTRICTED_BACKGROUND_CHECK);
    }
  }

  /**
   ** Policy Check Helpers
   **/

  private isNameChangeRestricted(dto: UpdateUserProfileDto, userRole: TUpdateUserProfileInformation): boolean {
    const hasNameFieldChanges = this.hasNameFieldChanges(dto);
    const hasVerifiedConcessionCard = this.hasVerifiedConcessionCard(userRole.userConcessionCard);
    const hasVerifiedSumSub = this.hasVerifiedSumSub(userRole.sumSubCheck);

    return hasNameFieldChanges && hasVerifiedConcessionCard && hasVerifiedSumSub;
  }

  private isTimezoneRequiredButMissing(dto: UpdateUserProfileDto): boolean {
    if (!dto.residentialAddress) {
      return false;
    }

    const { country, state, suburb } = dto.residentialAddress;

    const hasLocationFieldsChanges = Boolean(
      country !== UNDEFINED_VALUE || state !== UNDEFINED_VALUE || suburb !== UNDEFINED_VALUE,
    );
    const isTimezoneMissing = dto.residentialAddress.timezone === UNDEFINED_VALUE;

    return hasLocationFieldsChanges && isTimezoneMissing;
  }

  private isNameChangeRestrictedByVerifiedDocuments(
    dto: UpdateUserProfileDto,
    userRole: TUpdateUserProfileInformation,
  ): boolean {
    const hasNameFieldChanges = this.hasNameFieldChanges(dto);
    const hasVerifiedNaatiCertification = this.hasVerifiedNaatiCertification(userRole.naatiProfile);
    const hasVerifiedBackgroundCheck = this.hasVerifiedBackgroundCheck(userRole.backyCheck);
    const hasActiveAbn = this.hasActiveAbn(userRole.abnCheck);
    const hasSuccessfulIelts = this.hasSuccessfulIelts(userRole.ieltsCheck);
    const hasVerifiedLanguageDocs = this.hasVerifiedLanguageDocs(userRole.languageDocChecks);
    const hasVerifiedRightToWork = this.hasVerifiedRightToWork(userRole.rightToWorkChecks);

    const hasVerifiedProfessionalDocuments =
      hasVerifiedNaatiCertification ||
      hasVerifiedBackgroundCheck ||
      hasActiveAbn ||
      hasSuccessfulIelts ||
      hasVerifiedLanguageDocs ||
      hasVerifiedRightToWork;

    return hasNameFieldChanges && hasVerifiedProfessionalDocuments;
  }

  private isEmailChangeRestrictedByBackgroundCheck(
    dto: UpdateUserProfileDto,
    userRole: TUpdateUserProfileInformation,
  ): boolean {
    const hasContactEmailChange = Boolean(
      dto.profileInformation && dto.profileInformation.contactEmail !== UNDEFINED_VALUE,
    );

    if (!hasContactEmailChange) {
      return false;
    }

    const restrictiveBackgroundCheckStatuses: EExtCheckStatus[] = [
      EExtCheckStatus.OPEN,
      EExtCheckStatus.IN_PROGRESS,
      EExtCheckStatus.VERIFIED,
      EExtCheckStatus.IN_REVIEW,
    ];

    const hasRestrictiveBackgroundCheckStatus = Boolean(
      userRole.backyCheck &&
        userRole.backyCheck.checkStatus &&
        restrictiveBackgroundCheckStatuses.includes(userRole.backyCheck.checkStatus),
    );

    return hasContactEmailChange && hasRestrictiveBackgroundCheckStatus;
  }

  /**
   ** Verification Check Helpers
   **/

  private hasNameFieldChanges(dto: UpdateUserProfileDto): boolean {
    if (!dto.profileInformation) {
      return false;
    }

    const { firstName, middleName, lastName } = dto.profileInformation;

    return firstName !== UNDEFINED_VALUE || middleName !== UNDEFINED_VALUE || lastName !== UNDEFINED_VALUE;
  }

  private hasVerifiedConcessionCard(
    concessionCard: TUpdateUserProfileInformation["userConcessionCard"] | null,
  ): boolean {
    if (!concessionCard) {
      return false;
    }

    return Boolean(concessionCard.status === EUserConcessionCardStatus.VERIFIED);
  }

  private hasVerifiedSumSub(sumSubCheck: TUpdateUserProfileInformation["sumSubCheck"] | null): boolean {
    if (!sumSubCheck) {
      return false;
    }

    return Boolean(sumSubCheck.reviewAnswer === EExtSumSubReviewAnswer.GREEN);
  }

  private hasVerifiedNaatiCertification(naatiProfile: TUpdateUserProfileInformation["naatiProfile"] | null): boolean {
    if (!naatiProfile) {
      return false;
    }

    const { certifiedLanguages } = naatiProfile;

    return Boolean(certifiedLanguages && certifiedLanguages.length > 0);
  }

  private hasVerifiedBackgroundCheck(backyCheck: TUpdateUserProfileInformation["backyCheck"] | null): boolean {
    if (!backyCheck) {
      return false;
    }

    const { checkStatus, manualCheckResults } = backyCheck;

    return Boolean(checkStatus === EExtCheckStatus.READY || manualCheckResults === EManualCheckResult.MANUAL_APPROVED);
  }

  private hasActiveAbn(abnCheck: TUpdateUserProfileInformation["abnCheck"] | null): boolean {
    if (!abnCheck) {
      return false;
    }

    return Boolean(abnCheck.abnStatus === EExtAbnStatus.ACTIVE);
  }

  private hasSuccessfulIelts(ieltsCheck: TUpdateUserProfileInformation["ieltsCheck"] | null): boolean {
    if (!ieltsCheck) {
      return false;
    }

    return Boolean(ieltsCheck.status === EIeltsStatus.SUCCESS);
  }

  private hasVerifiedLanguageDocs(
    languageDocChecks: TUpdateUserProfileInformation["languageDocChecks"] | null,
  ): boolean {
    if (!languageDocChecks) {
      return false;
    }

    return Boolean(languageDocChecks.some((docCheck) => docCheck.status === ELanguageDocCheckRequestStatus.VERIFIED));
  }

  private hasVerifiedRightToWork(
    rightToWorkChecks: TUpdateUserProfileInformation["rightToWorkChecks"] | null,
  ): boolean {
    if (!rightToWorkChecks) {
      return false;
    }

    return Boolean(
      rightToWorkChecks.some((rightToWorkCheck) => rightToWorkCheck.status === ERightToWorkCheckStatus.VERIFIED),
    );
  }
}
