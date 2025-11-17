import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, Repository } from "typeorm";
import { UserDocument } from "src/modules/users/entities";
import { ICurrentUserData } from "src/modules/users/common/interfaces";
import { EDocumentType, EUserRoleName } from "src/modules/users/common/enums";
import { ActivationTrackingService } from "src/modules/activation-tracking/services";
import { AwsS3Service } from "src/modules/aws/s3/aws-s3.service";
import { EmailsService } from "src/modules/emails/services";
import { RightToWorkCheck } from "src/modules/right-to-work-check/entities";
import {
  CreateRightToWorkCheckDto,
  EditRightToWorkCheckDto,
  GetAllRightToWorkChecksDto,
  RightToWorkCheckManualDecisionDto,
} from "src/modules/right-to-work-check/common/dto";
import { ERightToWorkCheckErrorCodes, ERightToWorkCheckStatus } from "src/modules/right-to-work-check/common/enums";
import {
  EInterpreterCertificateType,
  EInterpreterType,
  ELanguageLevel,
  ELanguages,
} from "src/modules/interpreters/profile/common/enum";
import { InterpreterProfileService } from "src/modules/interpreters/profile/services";
import { UserRole } from "src/modules/users/entities";
import { IInterpreterProfile } from "src/modules/interpreters/profile/common/interface";
import { NotificationService } from "src/modules/notifications/services";
import { OptionalUUIDParamDto } from "src/common/dto";
import { ECommonErrorCodes, ESortOrder } from "src/common/enums";
import {
  CreateRightToWorkCheckOutput,
  EditRightToWorkCheckOutput,
  GetRightToWorkCheckOutput,
} from "src/modules/right-to-work-check/common/outputs";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { LokiLogger } from "src/common/logger";
import { HelperService } from "src/modules/helper/services";
import { ConfigService } from "@nestjs/config";
import { IFile } from "src/modules/file-management/common/interfaces";
import { AccessControlService } from "src/modules/access-control/services";
import { findOneOrFailTyped } from "src/common/utils";

@Injectable()
export class RightToWorkCheckService {
  private readonly lokiLogger = new LokiLogger(RightToWorkCheckService.name);
  private readonly FRONT_END_URL: string;

  constructor(
    @InjectRepository(RightToWorkCheck)
    private readonly rightToWorkCheckRepository: Repository<RightToWorkCheck>,
    @InjectRepository(UserDocument)
    private readonly userDocumentRepository: Repository<UserDocument>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly activationTrackingService: ActivationTrackingService,
    private readonly awsS3Service: AwsS3Service,
    private readonly emailsService: EmailsService,
    private readonly helperService: HelperService,
    private readonly interpreterProfileService: InterpreterProfileService,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
    private readonly accessControlService: AccessControlService,
  ) {
    this.FRONT_END_URL = this.configService.getOrThrow<string>("frontend.uri");
  }

  public async createRightToWorkCheck(
    dto: CreateRightToWorkCheckDto,
    user: ITokenUserData,
  ): Promise<CreateRightToWorkCheckOutput> {
    const isAdminOperation = this.accessControlService.checkAdminRoleForOperation(dto, user);
    const whereCondition: FindOptionsWhere<UserRole> = isAdminOperation
      ? { id: dto.userRoleId }
      : { id: user.userRoleId };

    const userRole = await findOneOrFailTyped<UserRole>(dto.userRoleId ?? user.userRoleId, this.userRoleRepository, {
      select: { id: true, operatedByCompanyId: true, operatedByMainCorporateCompanyId: true },
      where: whereCondition,
    });

    await this.accessControlService.authorizeUserRoleForOperation(user, userRole);
    const rightToWorkCheck = this.rightToWorkCheckRepository.create({
      languageFrom: dto.languageFrom,
      languageTo: dto.languageTo,
      documentName: dto.documentName,
      userRole,
    });

    const newRightToWorkCheck = await this.rightToWorkCheckRepository.save(rightToWorkCheck);

    return { id: newRightToWorkCheck.id };
  }

  public async uploadFileToRightToWorkCheck(
    id: string,
    user: ITokenUserData,
    file: IFile,
  ): Promise<CreateRightToWorkCheckOutput> {
    if (!file) {
      throw new BadRequestException(ECommonErrorCodes.FILE_NOT_RECEIVED);
    }

    const rightToWorkCheck = await findOneOrFailTyped<RightToWorkCheck>(id, this.rightToWorkCheckRepository, {
      select: {
        id: true,
        status: true,
        languageFrom: true,
        languageTo: true,
        document: { id: true, s3Key: true },
        userRole: {
          id: true,
          userId: true,
          isActive: true,
          operatedByCompanyId: true,
          operatedByMainCorporateCompanyId: true,
          role: { name: true },
          user: { id: true, platformId: true, email: true },
        },
      },
      where: { id },
      relations: { document: true, userRole: { role: true, user: true } },
    });

    await this.accessControlService.authorizeUserRoleForOperation(user, rightToWorkCheck.userRole);

    if (rightToWorkCheck.status === ERightToWorkCheckStatus.VERIFIED) {
      throw new BadRequestException(ERightToWorkCheckErrorCodes.FILE_UPLOAD_NOT_ALLOWED);
    }

    let document: UserDocument;

    if (rightToWorkCheck?.document) {
      await this.awsS3Service.deleteObject(rightToWorkCheck.document.s3Key);

      document = rightToWorkCheck.document;
      document.s3Key = file.key;
    } else {
      document = this.userDocumentRepository.create({
        documentType: EDocumentType.LANGUAGE_DOCS,
        s3Key: file.key,
        userRole: rightToWorkCheck.userRole,
        rightToWorkCheck,
      });
    }

    await this.userDocumentRepository.save(document);

    if (rightToWorkCheck.userRole.role.name === EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_IND_INTERPRETER) {
      await this.rightToWorkCheckRepository.update(
        { id: rightToWorkCheck.id },
        { status: ERightToWorkCheckStatus.VERIFIED },
      );

      await this.saveVerifiedData(rightToWorkCheck);
    }

    if (rightToWorkCheck.userRole.role.name !== EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_IND_INTERPRETER) {
      await this.rightToWorkCheckRepository.update(
        { id: rightToWorkCheck.id },
        { status: ERightToWorkCheckStatus.PENDING },
      );

      void this.sendEmailsToAdminsInBackground(rightToWorkCheck.userRole).catch((error: Error) => {
        this.lokiLogger.error(`Failed to send right to work check verification emails to admins:`, error.stack);
      });
    }

    return { id: rightToWorkCheck.id };
  }

  public async editRightToWorkCheck(
    dto: EditRightToWorkCheckDto,
    user: ITokenUserData,
    file?: IFile,
  ): Promise<EditRightToWorkCheckOutput> {
    const rightToWorkCheck = await findOneOrFailTyped<RightToWorkCheck>(dto.id, this.rightToWorkCheckRepository, {
      select: {
        id: true,
        status: true,
        document: { id: true, s3Key: true },
        userRole: {
          id: true,
          operatedByCompanyId: true,
          operatedByMainCorporateCompanyId: true,
          role: { name: true },
          user: { platformId: true },
        },
      },
      where: { id: dto.id },
      relations: { userRole: { role: true, user: true }, document: true },
    });

    await this.accessControlService.authorizeUserRoleForOperation(user, rightToWorkCheck.userRole);

    if (
      rightToWorkCheck.status !== ERightToWorkCheckStatus.DOCUMENT_VERIFICATION_FAILS &&
      rightToWorkCheck.status !== ERightToWorkCheckStatus.VERIFIED &&
      rightToWorkCheck.userRole.role.name !== EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_IND_INTERPRETER
    ) {
      throw new BadRequestException(ERightToWorkCheckErrorCodes.REQUEST_NOT_EDITABLE);
    }

    if (file) {
      if (rightToWorkCheck.document) {
        await this.awsS3Service.deleteObject(rightToWorkCheck.document.s3Key);

        await this.userDocumentRepository.update({ id: rightToWorkCheck.document.id }, { s3Key: file.key });
      }
    }

    if (rightToWorkCheck.userRole.role.name === EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_IND_INTERPRETER) {
      await this.rightToWorkCheckRepository.update(
        { id: rightToWorkCheck.id },
        { ...dto, status: ERightToWorkCheckStatus.VERIFIED },
      );
    }

    if (rightToWorkCheck.userRole.role.name !== EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_IND_INTERPRETER) {
      await this.rightToWorkCheckRepository.update(
        { id: rightToWorkCheck.id },
        {
          documentName: dto.documentName,
          languageTo: dto.languageTo,
          languageFrom: dto.languageFrom,
          status: ERightToWorkCheckStatus.PENDING,
        },
      );

      void this.sendEmailsToAdminsInBackground(rightToWorkCheck.userRole).catch((error: Error) => {
        this.lokiLogger.error(`Failed to send right to work check verification emails to admins:`, error.stack);
      });
    }

    return { id: rightToWorkCheck.id };
  }

  public async getAllRightToWorkChecks(
    dto: GetAllRightToWorkChecksDto,
    user: ITokenUserData,
  ): Promise<RightToWorkCheck[]> {
    const isAdminOperation = this.accessControlService.checkAdminRoleForOperation(dto, user);
    const whereCondition: FindOptionsWhere<RightToWorkCheck> = isAdminOperation
      ? { id: dto.userRoleId }
      : { id: user.userRoleId };

    const userRole = await this.userRoleRepository.findOne({
      select: { id: true, operatedByCompanyId: true, operatedByMainCorporateCompanyId: true },
      where: whereCondition,
      relations: { rightToWorkChecks: { document: true } },
      order: { rightToWorkChecks: { creationDate: ESortOrder.ASC } },
    });

    if (userRole) {
      await this.accessControlService.authorizeUserRoleForOperation(user, userRole);
    }

    return userRole?.rightToWorkChecks || [];
  }

  public async getRightToWorkCheck(
    user: ITokenUserData,
    dto: OptionalUUIDParamDto,
  ): Promise<GetRightToWorkCheckOutput | null> {
    const isAdminOperation = this.accessControlService.checkAdminRoleForOperation(dto, user);
    const whereCondition: FindOptionsWhere<RightToWorkCheck> = isAdminOperation
      ? { id: dto.id }
      : { userRole: { id: user.userRoleId } };

    let result: GetRightToWorkCheckOutput | null = null;

    if (isAdminOperation) {
      const rightToWorkCheck = await findOneOrFailTyped<RightToWorkCheck>(
        dto.id ?? user.userRoleId,
        this.rightToWorkCheckRepository,
        {
          select: { userRole: { id: true, operatedByCompanyId: true, operatedByMainCorporateCompanyId: true } },
          where: whereCondition,
          relations: { userRole: true, document: true },
        },
      );

      await this.accessControlService.authorizeUserRoleForOperation(user, rightToWorkCheck.userRole);
      result = rightToWorkCheck;
    } else {
      // TODO: Refactor O Temporary - return first check until multi-check functionality is implemented
      result = await this.rightToWorkCheckRepository.findOne({
        where: whereCondition,
        relations: { document: true },
      });
    }

    if (result?.document?.s3Key) {
      result.downloadLink = await this.awsS3Service.getShortLivedSignedUrl(result.document.s3Key);
    }

    return result;
  }

  public async rightToWorkCheckManualDecision(
    dto: RightToWorkCheckManualDecisionDto,
    user: ITokenUserData,
  ): Promise<void> {
    const rightToWorkCheck = await findOneOrFailTyped<RightToWorkCheck>(dto.id, this.rightToWorkCheckRepository, {
      select: {
        id: true,
        status: true,
        languageFrom: true,
        languageTo: true,
        document: { id: true, s3Key: true },
        userRole: {
          id: true,
          userId: true,
          isActive: true,
          operatedByCompanyId: true,
          operatedByMainCorporateCompanyId: true,
          role: { name: true },
          user: { id: true, platformId: true, email: true },
        },
      },
      where: { id: dto.id },
      relations: {
        userRole: {
          role: true,
          user: true,
        },
      },
    });

    await this.accessControlService.authorizeUserRoleForOperation(user, rightToWorkCheck.userRole);

    if (rightToWorkCheck.status === ERightToWorkCheckStatus.INITIALIZED) {
      throw new BadRequestException(ERightToWorkCheckErrorCodes.FILE_NOT_UPLOADED);
    }

    await this.rightToWorkCheckRepository.update({ id: dto.id }, { status: dto.status });

    if (dto.status === ERightToWorkCheckStatus.VERIFIED) {
      await this.saveVerifiedData(rightToWorkCheck);
    }

    await this.notifyUserAboutVerification(rightToWorkCheck.userRole, dto.status);

    return;
  }

  public async removeRightToWorkCheck(id: string, user: ITokenUserData): Promise<void> {
    const rightToWorkCheck = await findOneOrFailTyped<RightToWorkCheck>(id, this.rightToWorkCheckRepository, {
      select: {
        id: true,
        status: true,
        languageFrom: true,
        languageTo: true,
        document: { id: true, s3Key: true },
        languagePairs: true,
        userRole: {
          id: true,
          userId: true,
          isActive: true,
          operatedByCompanyId: true,
          operatedByMainCorporateCompanyId: true,
          role: { name: true },
          user: { email: true },
        },
      },
      where: { id },
      relations: { userRole: { role: true, user: true }, languagePairs: true, document: true },
    });

    await this.accessControlService.authorizeUserRoleForOperation(user, rightToWorkCheck.userRole);

    if (
      rightToWorkCheck.status !== ERightToWorkCheckStatus.DOCUMENT_VERIFICATION_FAILS &&
      rightToWorkCheck.status !== ERightToWorkCheckStatus.VERIFIED &&
      rightToWorkCheck.userRole.role.name !== EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_IND_INTERPRETER
    ) {
      throw new BadRequestException(ERightToWorkCheckErrorCodes.REQUEST_NOT_EDITABLE);
    }

    await this.interpreterProfileService.deleteLanguageFromInterpreterProfile(
      rightToWorkCheck.languagePairs,
      rightToWorkCheck.userRole.id,
    );

    await this.rightToWorkCheckRepository.delete({ id });

    if (rightToWorkCheck.document) {
      await this.awsS3Service.deleteObject(rightToWorkCheck.document.s3Key);
    }

    this.activationTrackingService.checkActivationStepsEnded(rightToWorkCheck.userRole).catch((error: Error) => {
      this.lokiLogger.error(
        `checkActivationStepsEnded error, userRoleId: ${rightToWorkCheck.userRole.id}`,
        error.stack,
      );
    });

    return;
  }

  private async createOrUpdateInterpreterProfile(userRole: UserRole, knownLanguages: ELanguages[]): Promise<void> {
    const interpreterProfile: IInterpreterProfile = {
      type: [EInterpreterType.INTERPRETER],
      certificateType: EInterpreterCertificateType.OTHER,
      knownLanguages,
      knownLevels: [ELanguageLevel.ZERO],
    };

    await this.interpreterProfileService.createOrUpdateInterpreterProfile(userRole.id, interpreterProfile);
  }

  private async notifyUserAboutVerification(userRole: UserRole, status: ERightToWorkCheckStatus): Promise<void> {
    const VERIFICATION = "Right To Work";

    if (status === ERightToWorkCheckStatus.VERIFIED) {
      this.emailsService.sendDocumentVerificationAccepted(userRole.user.email, VERIFICATION).catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send right to work check verification email for userRoleId: ${userRole.id}`,
          error.stack,
        );
      });
      this.notificationService.sendRightToWorkCheckVerificationNotification(userRole.id).catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send right to work check verification notification for userRoleId: ${userRole.id}`,
          error.stack,
        );
      });
    } else {
      this.emailsService.sendDocumentVerificationRejected(userRole.user.email, VERIFICATION).catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send right to work check error email for userRoleId: ${userRole.id}`,
          error.stack,
        );
      });
      this.notificationService.sendRightToWorkCheckErrorNotification(userRole.id).catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send right to work check error notification for userRoleId: ${userRole.id}`,
          error.stack,
        );
      });
    }
  }

  private async sendEmailsToAdminsInBackground(userRole: UserRole): Promise<void> {
    const superAdmins = await this.helperService.getSuperAdmin();
    const documentsAndPaymentLink = `${this.FRONT_END_URL}/members/details/${userRole.id}/documents_and_payment`;

    for (const superAdmin of superAdmins) {
      await this.emailsService.sendRightToWorkCheckNotifyToAdmin(
        superAdmin.email,
        userRole.user.platformId || "",
        documentsAndPaymentLink,
      );
    }
  }

  private async saveVerifiedData(rightToWorkCheck: RightToWorkCheck): Promise<void> {
    const currentUser: ICurrentUserData = {
      role: rightToWorkCheck.userRole.role.name,
      userRoleId: rightToWorkCheck.userRole.id,
      email: rightToWorkCheck.userRole.user.email,
      id: rightToWorkCheck.userRole.userId,
      isActive: rightToWorkCheck.userRole.isActive,
    };

    await this.createOrUpdateInterpreterProfile(rightToWorkCheck.userRole, [
      rightToWorkCheck.languageFrom,
      rightToWorkCheck.languageTo,
    ]);

    await this.interpreterProfileService.createLanguagePairs(
      currentUser as ITokenUserData,
      {
        languagePairs: [
          { from: rightToWorkCheck.languageFrom, to: rightToWorkCheck.languageTo },
          { from: rightToWorkCheck.languageTo, to: rightToWorkCheck.languageFrom },
        ],
      },
      rightToWorkCheck,
    );

    this.activationTrackingService.checkActivationStepsEnded(rightToWorkCheck.userRole).catch((error: Error) => {
      this.lokiLogger.error(
        `checkActivationStepsEnded error, userRoleId: ${rightToWorkCheck.userRole.id}`,
        error.stack,
      );
    });

    return;
  }

  public async removeRightToWorkFile(id: string, user: ITokenUserData): Promise<void> {
    const rightToWorkCheck = await findOneOrFailTyped<RightToWorkCheck>(id, this.rightToWorkCheckRepository, {
      select: {
        id: true,
        status: true,
        document: { id: true, s3Key: true },
        userRole: {
          id: true,
          operatedByCompanyId: true,
          operatedByMainCorporateCompanyId: true,
          role: { name: true },
        },
      },
      where: { id },
      relations: { userRole: { role: true }, document: true },
    });

    await this.accessControlService.authorizeUserRoleForOperation(user, rightToWorkCheck.userRole);

    if (
      rightToWorkCheck.status !== ERightToWorkCheckStatus.DOCUMENT_VERIFICATION_FAILS &&
      rightToWorkCheck.status !== ERightToWorkCheckStatus.VERIFIED &&
      rightToWorkCheck.userRole.role.name !== EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_IND_INTERPRETER
    ) {
      throw new BadRequestException(ERightToWorkCheckErrorCodes.REQUEST_NOT_DELETABLE);
    }

    if (!rightToWorkCheck.document) {
      throw new BadRequestException(ERightToWorkCheckErrorCodes.FILE_NOT_UPLOADED);
    }

    await this.awsS3Service.deleteObject(rightToWorkCheck.document.s3Key);
    await this.userDocumentRepository.remove(rightToWorkCheck.document);

    return;
  }
}
