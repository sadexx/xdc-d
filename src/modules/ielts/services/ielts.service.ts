import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { IeltsSdkService } from "src/modules/ielts/services";
import { InjectRepository } from "@nestjs/typeorm";
import { IeltsCheck } from "src/modules/ielts/entities";
import { FindOptionsWhere, Repository } from "typeorm";
import { EIeltsMessage, EIeltsStatus } from "src/modules/ielts/common/enums";
import { IResultVerification } from "src/modules/ielts/common/interfaces";
import { ActivationTrackingService } from "src/modules/activation-tracking/services";
import { UserRole } from "src/modules/users/entities";
import {
  EInterpreterCertificateType,
  EInterpreterType,
  ELanguageLevel,
  ELanguages,
} from "src/modules/interpreters/profile/common/enum";
import { IInterpreterProfile } from "src/modules/interpreters/profile/common/interface";
import { InterpreterProfileService } from "src/modules/interpreters/profile/services";
import { ConfigService } from "@nestjs/config";
import { MockService } from "src/modules/mock/services";
import { ELanguageDocCheckRequestStatus } from "src/modules/language-doc-check/common/enums";
import { InterpreterProfile } from "src/modules/interpreters/profile/entities";
import { IeltsVerificationDto } from "src/modules/ielts/common/dto";
import { OptionalUUIDParamDto } from "src/common/dto";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { InterpreterBadgeService } from "src/modules/interpreters/badge/services";
import { findOneOrFail } from "src/common/utils";
import { EmailsService } from "src/modules/emails/services";
import { LokiLogger } from "src/common/logger";
import { IIeltsVerificationOutput } from "src/modules/ielts/common/outputs";
import { AccessControlService } from "src/modules/access-control/services";
import { MOCK_ENABLED } from "src/common/constants";
import { EMockType } from "src/modules/mock/common/enums";

@Injectable()
export class IeltsService {
  private readonly lokiLogger = new LokiLogger(IeltsService.name);

  public constructor(
    @InjectRepository(IeltsCheck)
    private readonly ieltsCheckRepository: Repository<IeltsCheck>,
    @InjectRepository(InterpreterProfile)
    private readonly interpreterProfileRepository: Repository<InterpreterProfile>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly ieltsSdkService: IeltsSdkService,
    private readonly activationTrackingService: ActivationTrackingService,
    private readonly interpreterProfileService: InterpreterProfileService,
    private readonly configService: ConfigService,
    private readonly mockService: MockService,
    private readonly interpreterBadgeService: InterpreterBadgeService,
    private readonly emailsService: EmailsService,
    private readonly accessControlService: AccessControlService,
  ) {}

  public async ieltsVerification(dto: IeltsVerificationDto, user: ITokenUserData): Promise<IIeltsVerificationOutput> {
    const isAdminOperation = this.accessControlService.checkAdminRoleForOperation(dto, user);
    const whereCondition = isAdminOperation ? { id: dto.userRoleId } : { id: user.userRoleId };

    const userRole = await this.userRoleRepository.findOne({
      where: whereCondition,
      relations: { profile: true, languageDocChecks: true, ieltsCheck: true, role: true, user: true },
    });

    if (!userRole) {
      throw new NotFoundException("User not found.");
    }

    await this.validateIeltsRequest(userRole, dto);
    await this.accessControlService.authorizeUserRoleForOperation(user, userRole);

    if (!userRole.profile.nativeLanguage) {
      throw new BadRequestException("Please, set up your native language.");
    }

    let ieltsCheck: IeltsCheck;

    if (userRole.ieltsCheck) {
      ieltsCheck = userRole.ieltsCheck;
      ieltsCheck.status = null;
      ieltsCheck.trfNumber = dto.trfNumber;
    } else {
      ieltsCheck = this.ieltsCheckRepository.create({ trfNumber: dto.trfNumber, userRole });
    }

    const newIeltsCheck = await this.ieltsCheckRepository.save(ieltsCheck);

    let finalStatus: EIeltsStatus = EIeltsStatus.SUCCESS;
    let finalMessage: EIeltsMessage | undefined;

    try {
      const resultVerification = await this.fetchIeltsResult(dto, userRole, newIeltsCheck);

      if (resultVerification.resultSummary.recordCount === 0 || resultVerification.results.length === 0) {
        finalStatus = EIeltsStatus.FAIL;
        finalMessage = EIeltsMessage.RESULTS_NOT_FOUND;

        throw new BadRequestException("Incorrect number of certificate.");
      }

      if (
        resultVerification.results[0].firstName.toUpperCase() !== userRole.profile.firstName.toUpperCase() ||
        resultVerification.results[0].familyName.toUpperCase() !== userRole.profile.lastName.toUpperCase()
      ) {
        finalStatus = EIeltsStatus.FAIL;
        finalMessage = EIeltsMessage.NAME_DOES_NOT_MATCH;

        throw new BadRequestException("FirstName or lastName does not match.");
      }

      const minOverallScore = Number(this.configService.getOrThrow<string>("ielts.minOverallScore"));

      if (Number(resultVerification.results[0].overallBandScore) < minOverallScore) {
        finalStatus = EIeltsStatus.FAIL;
        finalMessage = EIeltsMessage.SCORE_NOT_ENOUGH;

        throw new BadRequestException("Certificate score is not enough.");
      }

      await this.ieltsCheckRepository.update({ id: newIeltsCheck.id }, { status: EIeltsStatus.SUCCESS });

      await this.interpreterProfileService.createLanguagePairs(
        { id: userRole.userId, role: userRole.role.name, userRoleId: userRole.id } as ITokenUserData,
        {
          languagePairs: [
            { from: ELanguages.ENGLISH, to: userRole.profile.nativeLanguage },
            { from: userRole.profile.nativeLanguage, to: ELanguages.ENGLISH },
          ],
        },
      );

      await this.createOrUpdateInterpreterProfile(userRole);

      this.activationTrackingService.checkActivationStepsEnded(userRole).catch((error: Error) => {
        this.lokiLogger.error(`checkActivationStepsEnded error, userRoleId: ${userRole.id}`, error.stack);
      });
    } catch (error) {
      await this.ieltsCheckRepository.update(newIeltsCheck.id, {
        status: finalStatus,
        message: finalMessage,
      });
      throw error;
    } finally {
      await this.notifyUserAboutVerification(userRole, finalStatus);
    }

    return { status: finalStatus };
  }

  private async fetchIeltsResult(
    dto: IeltsVerificationDto,
    userRole: UserRole,
    newIeltsCheck: IeltsCheck,
  ): Promise<IResultVerification> {
    if (MOCK_ENABLED && dto.trfNumber === this.mockService.mockIeltsNumber) {
      const { result } = await this.mockService.processMock({
        type: EMockType.IELTS_VERIFICATION,
        data: { firstName: userRole.profile.firstName, lastName: userRole.profile.lastName },
      });
      await this.ieltsCheckRepository.update({ id: newIeltsCheck.id }, { trfNumber: result.results[0].trfNumber });

      return result;
    }

    return await this.ieltsSdkService.resultVerification(dto.trfNumber);
  }

  public async getIeltsRequest(user: ITokenUserData, dto: OptionalUUIDParamDto): Promise<IeltsCheck | null> {
    const isAdminOperation = this.accessControlService.checkAdminRoleForOperation(dto, user);
    const whereCondition: FindOptionsWhere<IeltsCheck> = isAdminOperation
      ? { id: dto.id }
      : { userRole: { id: user.userRoleId } };

    const ieltsCheck = await this.ieltsCheckRepository.findOne({
      select: {
        userRole: { id: true, operatedByCompanyId: true, operatedByMainCorporateCompanyId: true },
      },
      where: whereCondition,
      relations: { userRole: true },
    });

    if (ieltsCheck) {
      await this.accessControlService.authorizeUserRoleForOperation(user, ieltsCheck.userRole);
    }

    return ieltsCheck;
  }

  public async removeIeltsRequest(id: string): Promise<void> {
    const ieltsRequest = await findOneOrFail(id, this.ieltsCheckRepository, {
      where: { id },
      relations: { userRole: { interpreterProfile: true } },
    });

    const { userRole } = ieltsRequest;

    await this.ieltsCheckRepository.delete({ id });
    await this.interpreterProfileRepository.delete({ userRole: { id: userRole.id } });

    if (userRole.interpreterProfile && userRole.interpreterProfile.interpreterBadgePdf) {
      await this.interpreterBadgeService.removeInterpreterBadgePdf(userRole.interpreterProfile.interpreterBadgePdf);
    }

    return;
  }

  private async createOrUpdateInterpreterProfile(userRole: UserRole): Promise<void> {
    const interpreterProfile: IInterpreterProfile = {
      type: [EInterpreterType.INTERPRETER],
      certificateType: EInterpreterCertificateType.IELTS,
      knownLanguages: [ELanguages.ENGLISH, userRole.profile.nativeLanguage!],
      knownLevels: [ELanguageLevel.ZERO],
    };

    await this.interpreterProfileService.createOrUpdateInterpreterProfile(userRole.id, interpreterProfile);
  }

  private async notifyUserAboutVerification(userRole: UserRole, status: EIeltsStatus): Promise<void> {
    const VERIFICATION = "IELTS";

    if (status === EIeltsStatus.SUCCESS) {
      this.emailsService.sendDocumentVerificationAccepted(userRole.user.email, VERIFICATION).catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send ielts check verification email for userRoleId: ${userRole.id}`,
          error.stack,
        );
      });
    } else {
      this.emailsService.sendDocumentVerificationRejected(userRole.user.email, VERIFICATION).catch((error: Error) => {
        this.lokiLogger.error(`Failed to send ielts check rejected email for userRoleId: ${userRole.id}`, error.stack);
      });
    }
  }

  private async validateIeltsRequest(userRole: UserRole, dto: IeltsVerificationDto): Promise<void> {
    if (userRole.isActive) {
      throw new BadRequestException("User role or profile status does not permit this operation.");
    }

    if (
      userRole.languageDocChecks &&
      userRole.languageDocChecks.some(
        (docCheck) => docCheck.status !== ELanguageDocCheckRequestStatus.DOCUMENT_VERIFICATION_FAILS,
      )
    ) {
      throw new BadRequestException("This user already have other language doc check.");
    }

    if (userRole.ieltsCheck && userRole.ieltsCheck.status !== EIeltsStatus.FAIL) {
      throw new BadRequestException("IELTS verification for this user already exists.");
    }

    const existingCertificateIeltsCheck = await this.ieltsCheckRepository.findOne({
      where: { trfNumber: dto.trfNumber },
    });

    if (existingCertificateIeltsCheck && existingCertificateIeltsCheck.status !== EIeltsStatus.FAIL) {
      throw new BadRequestException("IELTS verification for this certificate already exists.");
    }
  }
}
