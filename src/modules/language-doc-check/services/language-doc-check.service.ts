import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, Repository } from "typeorm";
import { UserDocument } from "src/modules/users/entities";
import { EDocumentType } from "src/modules/users/common/enums";
import { ActivationTrackingService } from "src/modules/activation-tracking/services";
import { AwsS3Service } from "src/modules/aws/s3/aws-s3.service";
import {
  CreateLanguageDocCheckDto,
  LanguageDocCheckManualDecisionDto,
  UpdateLanguageDocCheckDto,
} from "src/modules/language-doc-check/common/dto";
import { CreateLanguageDocCheckOutput, GetLanguageDocCheckOutput } from "src/modules/language-doc-check/common/outputs";
import {
  ELanguageDocCheckErrorCodes,
  ELanguageDocCheckRequestStatus,
} from "src/modules/language-doc-check/common/enums";
import { EmailsService } from "src/modules/emails/services";
import {
  EInterpreterCertificateType,
  EInterpreterType,
  ELanguageLevel,
  ELanguages,
} from "src/modules/interpreters/profile/common/enum";
import { InterpreterProfileService } from "src/modules/interpreters/profile/services";
import { UserRole } from "src/modules/users/entities";
import { IInterpreterProfile } from "src/modules/interpreters/profile/common/interface";
import { EIeltsStatus } from "src/modules/ielts/common/enums";
import { InterpreterProfile } from "src/modules/interpreters/profile/entities";
import { NotificationService } from "src/modules/notifications/services";
import { OptionalUUIDParamDto } from "src/common/dto";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { InterpreterBadgeService } from "src/modules/interpreters/badge/services";
import { LokiLogger } from "src/common/logger";
import { LanguageDocCheck } from "src/modules/language-doc-check/entities";
import { findOneOrFailTyped } from "src/common/utils";
import { ICurrentUserData } from "src/modules/users/common/interfaces";
import { LanguagePairDto } from "src/modules/interpreters/profile/common/dto";
import { HelperService } from "src/modules/helper/services";
import { ConfigService } from "@nestjs/config";
import { IFile } from "src/modules/file-management/common/interfaces";
import { AccessControlService } from "src/modules/access-control/services";
import { ECommonErrorCodes } from "src/common/enums";

@Injectable()
export class LanguageDocCheckService {
  private readonly lokiLogger = new LokiLogger(LanguageDocCheckService.name);
  private readonly FRONT_END_URL: string;

  constructor(
    @InjectRepository(LanguageDocCheck)
    private readonly languageDocCheckRepository: Repository<LanguageDocCheck>,
    @InjectRepository(UserDocument)
    private readonly userDocumentRepository: Repository<UserDocument>,
    @InjectRepository(InterpreterProfile)
    private readonly interpreterProfileRepository: Repository<InterpreterProfile>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly activationTrackingService: ActivationTrackingService,
    private readonly awsS3Service: AwsS3Service,
    private readonly emailsService: EmailsService,
    private readonly helperService: HelperService,
    private readonly interpreterProfileService: InterpreterProfileService,
    private readonly notificationService: NotificationService,
    private readonly interpreterBadgeService: InterpreterBadgeService,
    private readonly configService: ConfigService,
    private readonly accessControlService: AccessControlService,
  ) {
    this.FRONT_END_URL = this.configService.getOrThrow<string>("frontend.uri");
  }

  public async getUsersLanguageDocChecks(
    user: ITokenUserData,
    dto: OptionalUUIDParamDto,
  ): Promise<GetLanguageDocCheckOutput[]> {
    const isAdminOperation = this.accessControlService.checkAdminRoleForOperation(dto, user);
    const whereCondition: FindOptionsWhere<LanguageDocCheck> = isAdminOperation
      ? { userRole: { id: dto.id } }
      : { userRole: { id: user.userRoleId } };

    const languageDocChecks: GetLanguageDocCheckOutput[] = await this.languageDocCheckRepository.find({
      select: {
        userRole: { id: true, operatedByCompanyId: true, operatedByMainCorporateCompanyId: true },
        document: { s3Key: true },
      },
      where: whereCondition,
      relations: { document: true, userRole: true },
    });

    for (const languageDocCheck of languageDocChecks) {
      await this.accessControlService.authorizeUserRoleForOperation(user, languageDocCheck.userRole);

      if (languageDocCheck?.document?.s3Key) {
        languageDocCheck.downloadLink = await this.awsS3Service.getShortLivedSignedUrl(languageDocCheck.document.s3Key);
      }
    }

    return languageDocChecks;
  }

  public async createLanguageDocCheck(
    dto: CreateLanguageDocCheckDto,
    user: ITokenUserData,
  ): Promise<CreateLanguageDocCheckOutput> {
    const isAdminOperation = this.accessControlService.checkAdminRoleForOperation(dto, user);
    const whereCondition: FindOptionsWhere<UserRole> = isAdminOperation
      ? { id: dto.userRoleId }
      : { id: user.userRoleId };

    const userRole = await findOneOrFailTyped<UserRole>(dto.userRoleId ?? user.userRoleId, this.userRoleRepository, {
      select: {
        id: true,
        operatedByCompanyId: true,
        operatedByMainCorporateCompanyId: true,
        profile: { nativeLanguage: true },
        ieltsCheck: { status: true },
        languageDocChecks: { id: true, language: true, status: true },
      },
      where: whereCondition,
      relations: { languageDocChecks: true, ieltsCheck: true, profile: true },
    });

    await this.accessControlService.authorizeUserRoleForOperation(user, userRole);

    const languageToCheck = dto.language ?? ELanguages.ENGLISH;
    await this.validateLanguageDocCheckRequest(dto, userRole, user, languageToCheck);

    const failedDocCheck = userRole.languageDocChecks?.find(
      (doc) =>
        doc.language === languageToCheck && doc.status === ELanguageDocCheckRequestStatus.DOCUMENT_VERIFICATION_FAILS,
    );

    if (failedDocCheck) {
      await this.languageDocCheckRepository.update(failedDocCheck.id, {
        ...dto,
        status: ELanguageDocCheckRequestStatus.INITIALIZED,
      });

      return { id: failedDocCheck.id };
    } else {
      const newLanguageDocCheck = this.languageDocCheckRepository.create({ ...dto, userRole });
      const savedDocCheck = await this.languageDocCheckRepository.save(newLanguageDocCheck);

      return { id: savedDocCheck.id };
    }
  }

  public async uploadFileToLanguageDocCheck(id: string, user: ITokenUserData, file: IFile): Promise<void> {
    if (!file) {
      throw new BadRequestException(ECommonErrorCodes.FILE_NOT_RECEIVED);
    }

    const languageDocCheck = await findOneOrFailTyped<LanguageDocCheck>(id, this.languageDocCheckRepository, {
      select: {
        id: true,
        pteTestRegistrationId: true,
        pteScoreReportCode: true,
        status: true,
        document: { id: true, s3Key: true },
        userRole: {
          id: true,
          operatedByCompanyId: true,
          operatedByMainCorporateCompanyId: true,
          user: { id: true, platformId: true },
        },
      },
      where: { id },
      relations: { document: true, userRole: { user: true } },
    });

    await this.accessControlService.authorizeUserRoleForOperation(user, languageDocCheck.userRole);

    if (languageDocCheck.status === ELanguageDocCheckRequestStatus.VERIFIED) {
      throw new BadRequestException(ELanguageDocCheckErrorCodes.UPLOAD_NOT_ALLOWED);
    }

    let document: UserDocument;

    if (languageDocCheck?.document) {
      await this.awsS3Service.deleteObject(languageDocCheck.document.s3Key);

      document = languageDocCheck.document;
      document.s3Key = file.key;
    } else {
      document = this.userDocumentRepository.create({
        documentType: EDocumentType.LANGUAGE_DOCS,
        s3Key: file.key,
        userRole: languageDocCheck.userRole,
        languageDocCheck,
      });
    }

    await this.userDocumentRepository.save(document);
    await this.languageDocCheckRepository.update(
      { id: languageDocCheck.id },
      { status: ELanguageDocCheckRequestStatus.PENDING },
    );

    void this.sendEmailsToAdminsInBackground(languageDocCheck).catch((error: Error) =>
      this.lokiLogger.error(
        `Failed to send emails to admins in background for language doc check: ${languageDocCheck.id}`,
        error.stack,
      ),
    );
  }

  public async updateLanguageDocCheck(
    dto: UpdateLanguageDocCheckDto,
    user: ITokenUserData,
    file?: IFile,
  ): Promise<void> {
    const languageDocCheck = await findOneOrFailTyped<LanguageDocCheck>(dto.id, this.languageDocCheckRepository, {
      select: {
        id: true,
        pteTestRegistrationId: true,
        pteScoreReportCode: true,
        status: true,
        document: { id: true, s3Key: true },
        userRole: {
          id: true,
          operatedByCompanyId: true,
          operatedByMainCorporateCompanyId: true,
          user: { id: true, platformId: true },
          interpreterProfile: { id: true, languagePairs: true },
        },
      },
      where: { id: dto.id },
      relations: {
        userRole: { user: true, interpreterProfile: { languagePairs: true } },
        document: true,
      },
    });

    await this.accessControlService.authorizeUserRoleForOperation(user, languageDocCheck.userRole);

    if (
      languageDocCheck.status === ELanguageDocCheckRequestStatus.PENDING ||
      languageDocCheck.status === ELanguageDocCheckRequestStatus.INITIALIZED
    ) {
      throw new BadRequestException(ELanguageDocCheckErrorCodes.COMMON_CHECK_IN_STATUS_PENDING);
    }

    if (file) {
      if (languageDocCheck.document) {
        await this.awsS3Service.deleteObject(languageDocCheck.document.s3Key);

        await this.userDocumentRepository.update({ id: languageDocCheck.document.id }, { s3Key: file.key });
      }
    }

    await this.languageDocCheckRepository.update(
      { id: languageDocCheck.id },
      {
        pteTestRegistrationId: dto.pteTestRegistrationId,
        pteScoreReportCode: dto.pteScoreReportCode,
        language: dto.language ?? ELanguages.ENGLISH,
        status: ELanguageDocCheckRequestStatus.PENDING,
      },
    );
    await this.handleDeleteLanguageFromInterpreterProfile(languageDocCheck);

    void this.sendEmailsToAdminsInBackground(languageDocCheck).catch((error: Error) =>
      this.lokiLogger.error(
        `Failed to send emails to admins in background for language doc check: ${languageDocCheck.id}`,
        error.stack,
      ),
    );
  }

  private async handleDeleteLanguageFromInterpreterProfile(languageDocCheck: LanguageDocCheck): Promise<void> {
    const interpreterProfile = languageDocCheck.userRole.interpreterProfile;
    const languageToRemove = languageDocCheck.language;

    if (!interpreterProfile) {
      return;
    }

    const languagePairsToRemove = interpreterProfile.languagePairs.filter(
      (pair) => pair.languageFrom === languageToRemove || pair.languageTo === languageToRemove,
    );

    if (languagePairsToRemove.length > 0) {
      await this.interpreterProfileService.deleteLanguageFromInterpreterProfile(
        languagePairsToRemove,
        languageDocCheck.userRole.id,
      );
    }
  }

  public async languageDocCheckManualDecision(
    dto: LanguageDocCheckManualDecisionDto,
    user: ITokenUserData,
  ): Promise<void> {
    const languageDocCheck = await findOneOrFailTyped<LanguageDocCheck>(dto.id, this.languageDocCheckRepository, {
      select: {
        id: true,
        pteTestRegistrationId: true,
        pteScoreReportCode: true,
        status: true,
        language: true,
        userRole: {
          id: true,
          isActive: true,
          operatedByCompanyId: true,
          operatedByMainCorporateCompanyId: true,
          user: { id: true, platformId: true, email: true },
          role: { name: true },
          profile: { nativeLanguage: true },
          interpreterProfile: { id: true, knownLanguages: true },
        },
      },
      where: { id: dto.id },
      relations: { userRole: { role: true, user: true, profile: true, interpreterProfile: true } },
    });

    await this.accessControlService.authorizeUserRoleForOperation(user, languageDocCheck.userRole);

    if (languageDocCheck.status === ELanguageDocCheckRequestStatus.INITIALIZED) {
      throw new BadRequestException(ELanguageDocCheckErrorCodes.COMMON_NO_UPLOADED_FILE);
    }

    await this.languageDocCheckRepository.update({ id: dto.id }, { status: dto.status });

    if (dto.status === ELanguageDocCheckRequestStatus.VERIFIED) {
      const currentUser: ICurrentUserData = {
        role: languageDocCheck.userRole.role.name,
        userRoleId: languageDocCheck.userRole.id,
        email: languageDocCheck.userRole.user.email,
        id: languageDocCheck.userRole.userId,
        isActive: languageDocCheck.userRole.isActive,
      };

      await this.createOrUpdateInterpreterProfile(languageDocCheck);
      await this.generateLanguageDocCheckPairs(languageDocCheck.userRole, currentUser, languageDocCheck.language);

      this.activationTrackingService.checkActivationStepsEnded(languageDocCheck.userRole).catch((error: Error) => {
        this.lokiLogger.error(
          `checkActivationStepsEnded error, userRoleId: ${languageDocCheck.userRole.id}`,
          error.stack,
        );
      });
    }

    void this.notifyUserAboutManualDecision(languageDocCheck, dto);

    return;
  }

  public async removeLanguageDocCheck(id: string, user: ITokenUserData): Promise<void> {
    const languageDocCheck = await findOneOrFailTyped<LanguageDocCheck>(id, this.languageDocCheckRepository, {
      select: {
        id: true,
        status: true,
        document: { id: true, s3Key: true },
        userRole: {
          id: true,
          operatedByCompanyId: true,
          operatedByMainCorporateCompanyId: true,
          interpreterProfile: { id: true, interpreterBadgePdf: true },
        },
      },
      where: { id },
      relations: { userRole: { interpreterProfile: true }, document: true },
    });
    const { userRole } = languageDocCheck;

    await this.accessControlService.authorizeUserRoleForOperation(user, userRole);

    if (
      languageDocCheck.status === ELanguageDocCheckRequestStatus.PENDING ||
      languageDocCheck.status === ELanguageDocCheckRequestStatus.INITIALIZED
    ) {
      throw new BadRequestException(ELanguageDocCheckErrorCodes.REMOVAL_STATUS_PENDING);
    }

    await this.languageDocCheckRepository.delete({ id });
    await this.interpreterProfileRepository.delete({ userRole: { id: userRole.id } });

    if (languageDocCheck.document) {
      await this.awsS3Service.deleteObject(languageDocCheck.document.s3Key);
    }

    if (userRole.interpreterProfile && userRole.interpreterProfile.interpreterBadgePdf) {
      await this.interpreterBadgeService.removeInterpreterBadgePdf(userRole.interpreterProfile.interpreterBadgePdf);
    }

    return;
  }

  public async removeLanguageDocCheckFile(id: string, user: ITokenUserData): Promise<void> {
    const languageDocCheck = await findOneOrFailTyped<LanguageDocCheck>(id, this.languageDocCheckRepository, {
      select: {
        id: true,
        document: { id: true, s3Key: true },
        userRole: {
          id: true,
          operatedByCompanyId: true,
          operatedByMainCorporateCompanyId: true,
        },
      },
      where: { id },
      relations: { userRole: true, document: true },
    });

    await this.accessControlService.authorizeUserRoleForOperation(user, languageDocCheck.userRole);

    if (!languageDocCheck.document) {
      throw new BadRequestException(ELanguageDocCheckErrorCodes.COMMON_NO_UPLOADED_FILE);
    }

    await this.awsS3Service.deleteObject(languageDocCheck.document.s3Key);
    await this.userDocumentRepository.remove(languageDocCheck.document);

    await this.languageDocCheckRepository.update(languageDocCheck.id, {
      status: ELanguageDocCheckRequestStatus.INITIALIZED,
    });

    return;
  }

  private async generateLanguageDocCheckPairs(
    userRole: UserRole,
    currentUser: ICurrentUserData,
    newLanguage: ELanguages,
  ): Promise<void> {
    if (!userRole.profile.nativeLanguage || !userRole.interpreterProfile) {
      throw new BadRequestException(ELanguageDocCheckErrorCodes.VALIDATION_NATIVE_LANGUAGE_NOT_SET);
    }

    await this.interpreterProfileService.createLanguagePairs(currentUser as ITokenUserData, {
      languagePairs: [
        { from: newLanguage, to: userRole.profile.nativeLanguage },
        { from: userRole.profile.nativeLanguage, to: newLanguage },
      ],
    });

    const foreignLanguages = userRole.interpreterProfile.knownLanguages.filter(
      (language) => language !== userRole.profile.nativeLanguage && language !== newLanguage,
    );

    const missingPairs: LanguagePairDto[] = [];
    for (const foreignLanguage of foreignLanguages) {
      missingPairs.push({ from: newLanguage, to: foreignLanguage });
      missingPairs.push({ from: foreignLanguage, to: newLanguage });
    }

    if (missingPairs.length > 0) {
      await this.interpreterProfileService.createLanguagePairs(currentUser as ITokenUserData, {
        languagePairs: missingPairs,
      });
    }
  }

  private async createOrUpdateInterpreterProfile(languageDocCheck: LanguageDocCheck): Promise<void> {
    const interpreterProfile: IInterpreterProfile = {
      type: [EInterpreterType.INTERPRETER],
      certificateType: EInterpreterCertificateType.OTHER,
      knownLanguages: [languageDocCheck.language, languageDocCheck.userRole.profile.nativeLanguage!],
      knownLevels: [ELanguageLevel.ZERO],
    };

    await this.interpreterProfileService.createOrUpdateInterpreterProfile(
      languageDocCheck.userRole.id,
      interpreterProfile,
    );
  }

  private async notifyUserAboutManualDecision(
    languageDocCheck: LanguageDocCheck,
    dto: LanguageDocCheckManualDecisionDto,
  ): Promise<void> {
    const { userRole, pteTestRegistrationId, pteScoreReportCode } = languageDocCheck;
    const isPte = Boolean(pteTestRegistrationId || pteScoreReportCode);
    const VERIFICATION = isPte ? "PTE" : "Language Doc Check";

    if (dto.status === ELanguageDocCheckRequestStatus.VERIFIED) {
      await this.emailsService.sendDocumentVerificationAccepted(userRole.user.email, VERIFICATION);
      this.notificationService
        .sendLanguageDocCheckVerificationNotification(languageDocCheck.userRole.id)
        .catch((error: Error) => {
          this.lokiLogger.error(
            `Failed to send language doc check verification notification for userRoleId: ${languageDocCheck.userRole.id}`,
            error.stack,
          );
        });
    } else {
      await this.emailsService.sendDocumentVerificationRejected(userRole.user.email, VERIFICATION);
      this.notificationService
        .sendLanguageDocCheckErrorNotification(languageDocCheck.userRole.id)
        .catch((error: Error) => {
          this.lokiLogger.error(
            `Failed to send language doc check verification notification for userRoleId: ${languageDocCheck.userRole.id}`,
            error.stack,
          );
        });
    }
  }

  private async sendEmailsToAdminsInBackground(languageDocCheck: LanguageDocCheck): Promise<void> {
    const { userRole, pteTestRegistrationId, pteScoreReportCode } = languageDocCheck;
    const isPte = Boolean(pteTestRegistrationId || pteScoreReportCode);

    const superAdmins = await this.helperService.getSuperAdmin();
    const documentsAndPaymentLink = `${this.FRONT_END_URL}/members/details/${userRole.id}/documents_and_payment`;

    for (const superAdmin of superAdmins) {
      if (isPte) {
        await this.emailsService.sendPteCheckNotifyToAdmin(
          superAdmin.email,
          userRole.user.platformId || "",
          documentsAndPaymentLink,
        );
      } else {
        await this.emailsService.sendLanguageDocNotifyToAdmin(
          superAdmin.email,
          userRole.user.platformId || "",
          documentsAndPaymentLink,
        );
      }
    }
  }

  private async validateLanguageDocCheckRequest(
    dto: CreateLanguageDocCheckDto,
    userRole: UserRole,
    user: ITokenUserData,
    languageToCheck: ELanguages,
  ): Promise<void> {
    if (userRole.profile.nativeLanguage === languageToCheck) {
      throw new BadRequestException(ELanguageDocCheckErrorCodes.VALIDATION_SAME_AS_NATIVE_LANGUAGE);
    }

    const existingDocCheck = userRole.languageDocChecks?.find(
      (doc) =>
        doc.language === languageToCheck && doc.status !== ELanguageDocCheckRequestStatus.DOCUMENT_VERIFICATION_FAILS,
    );

    if (existingDocCheck) {
      throw new BadRequestException(ELanguageDocCheckErrorCodes.VALIDATION_ALREADY_EXISTS_FOR_LANGUAGE);
    }

    if (userRole.ieltsCheck && userRole.ieltsCheck.status !== EIeltsStatus.FAIL) {
      throw new BadRequestException(ELanguageDocCheckErrorCodes.VALIDATION_IELTS_CHECK_EXISTS);
    }

    if (dto.pteTestRegistrationId && dto.pteScoreReportCode) {
      const existingPteCheck = await this.languageDocCheckRepository.findOne({
        select: { id: true, userRole: { id: true, userId: true } },
        where: [{ pteTestRegistrationId: dto.pteTestRegistrationId }, { pteScoreReportCode: dto.pteScoreReportCode }],
        relations: { userRole: true },
      });

      if (existingPteCheck && existingPteCheck.userRole.userId !== user.id) {
        throw new BadRequestException(ELanguageDocCheckErrorCodes.VALIDATION_PTE_NUMBERS_EXIST);
      }
    }
  }
}
