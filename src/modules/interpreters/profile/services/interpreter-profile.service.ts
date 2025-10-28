import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, Repository } from "typeorm";
import { CustomInsurance, InterpreterProfile, LanguagePair } from "src/modules/interpreters/profile/entities";
import { IInterpreterProfile } from "src/modules/interpreters/profile/common/interface";
import { UserRole } from "src/modules/users/entities";
import { EExtInterpreterLevel } from "src/modules/naati/common/enum";
import {
  EInterpretersProfileErrorCodes,
  ELanguageLevel,
  ELanguages,
} from "src/modules/interpreters/profile/common/enum";
import {
  CreateLanguagePairDto,
  CustomInsuranceDto,
  SetInterpreterOnlineDto,
  UpdateInterpreterProfileDto,
} from "src/modules/interpreters/profile/common/dto";
import { EExtCountry } from "src/modules/addresses/common/enums";
import { ActivationTrackingService } from "src/modules/activation-tracking/services";
import { AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES } from "src/modules/addresses/common/constants/constants";
import { RightToWorkCheck } from "src/modules/right-to-work-check/entities";
import { OptionalUUIDParamDto } from "src/common/dto";
import { isUUID } from "validator";
import { OrderEventDto } from "src/modules/web-socket-gateway/common/dto";
import { addMonths } from "date-fns";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { EUserRoleName } from "src/modules/users/common/enums";
import { IMessageOutput } from "src/common/outputs";
import { findOneOrFail, findOneOrFailTyped } from "src/common/utils";
import { InterpreterBadgeService } from "src/modules/interpreters/badge/services";
import { LokiLogger } from "src/common/logger";
import { AccessControlService } from "src/modules/access-control/services";
import { CreateInterpreterQuestionnaireDto } from "src/modules/interpreters/questionnaire/common/dto";
import { EExtCheckResult, EExtCheckStatus, EManualCheckResult } from "src/modules/backy-check/common/enums";
import { BackyCheck } from "src/modules/backy-check/entities";

@Injectable()
export class InterpreterProfileService {
  private readonly lokiLogger = new LokiLogger(InterpreterProfileService.name);
  constructor(
    @InjectRepository(InterpreterProfile)
    private readonly interpreterProfileRepository: Repository<InterpreterProfile>,
    @InjectRepository(CustomInsurance)
    private readonly customInsuranceRepository: Repository<CustomInsurance>,
    @InjectRepository(LanguagePair)
    private readonly languagePairRepository: Repository<LanguagePair>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly activationTrackingService: ActivationTrackingService,
    private readonly interpreterBadgeService: InterpreterBadgeService,
    private readonly accessControlService: AccessControlService,
  ) {}

  public async getInterpreterProfile(user: ITokenUserData): Promise<InterpreterProfile> {
    const interpreterProfile = await findOneOrFail(user.userRoleId, this.interpreterProfileRepository, {
      select: {
        cancellationRecord: {
          id: true,
          lockStartDate: true,
          lockEndDate: true,
        },
      },
      where: { userRole: { id: user.userRoleId } },
      relations: { cancellationRecord: true },
    });

    return interpreterProfile;
  }

  public async getLanguagePairs(user: ITokenUserData, dto: OptionalUUIDParamDto): Promise<LanguagePair[] | null> {
    const isAdminOperation = this.accessControlService.checkAdminRoleForOperation(dto, user);
    const whereCondition: FindOptionsWhere<InterpreterProfile> = isAdminOperation
      ? { id: dto.id }
      : { userRole: { id: user.userRoleId } };

    const interpreterProfile = await this.interpreterProfileRepository.findOne({
      select: {
        id: true,
        languagePairs: true,
        userRole: { id: true, operatedByCompanyId: true, operatedByMainCorporateCompanyId: true },
      },
      where: whereCondition,
      relations: { languagePairs: true, userRole: true },
    });

    if (!interpreterProfile) {
      return null;
    }

    await this.accessControlService.authorizeUserRoleForOperation(user, interpreterProfile.userRole);

    return interpreterProfile.languagePairs;
  }

  public async createOrUpdateInterpreterProfile(
    userRoleId: string,
    interpreterProfile: IInterpreterProfile,
  ): Promise<void> {
    const existingInterpreterProfile = await this.interpreterProfileRepository.findOne({
      where: { userRole: { id: userRoleId } },
    });

    if (!existingInterpreterProfile) {
      const newInterpreterProfile = this.interpreterProfileRepository.create({
        userRole: { id: userRoleId } as UserRole,
        ...interpreterProfile,
      });
      await this.interpreterProfileRepository.save(newInterpreterProfile);
    }

    if (existingInterpreterProfile) {
      interpreterProfile.knownLanguages.push(...existingInterpreterProfile.knownLanguages);
      interpreterProfile.knownLanguages = Array.from(new Set(interpreterProfile.knownLanguages));
      interpreterProfile.type.push(...existingInterpreterProfile.type);
      interpreterProfile.type = Array.from(new Set(interpreterProfile.type));

      await this.interpreterProfileRepository.update(existingInterpreterProfile.id, {
        ...interpreterProfile,
      });
    }
  }

  public async deleteLanguageFromInterpreterProfile(languagePairs: LanguagePair[], userRoleId: string): Promise<void> {
    const interpreterProfile = await findOneOrFail(userRoleId, this.interpreterProfileRepository, {
      where: { userRole: { id: userRoleId } },
      relations: {
        languagePairs: true,
      },
    });

    const knownLanguages: ELanguages[] = [];

    for (const languagePair of interpreterProfile.languagePairs) {
      knownLanguages.push(languagePair.languageFrom);
      knownLanguages.push(languagePair.languageTo);
    }

    const removingLanguages: ELanguages[] = [];

    for (const pair of languagePairs) {
      removingLanguages.push(pair.languageFrom);
      removingLanguages.push(pair.languageTo);
    }

    for (const language of removingLanguages) {
      knownLanguages.splice(knownLanguages.indexOf(language), 1);
    }

    const newKnownLanguages: ELanguages[] = Array.from(new Set(knownLanguages));

    await this.interpreterProfileRepository.update(
      { id: interpreterProfile.id },
      { knownLanguages: newKnownLanguages },
    );
    await this.languagePairRepository.remove(languagePairs);
  }

  public async createLanguagePairs(
    user: ITokenUserData,
    dto: CreateLanguagePairDto,
    rightToWorkCheck?: RightToWorkCheck,
  ): Promise<void> {
    const isAdminOperation = this.accessControlService.checkAdminRoleForOperation(dto, user);
    const whereCondition: FindOptionsWhere<InterpreterProfile> = isAdminOperation
      ? { userRole: { id: dto.userRoleId } }
      : { userRole: { id: user.userRoleId } };

    const interpreterProfile = await findOneOrFail(
      dto.userRoleId ?? user.userRoleId,
      this.interpreterProfileRepository,
      {
        where: whereCondition,
        relations: { userRole: true },
      },
    );

    await this.accessControlService.authorizeUserRoleForOperation(user, interpreterProfile.userRole);

    for (const pair of dto.languagePairs) {
      const languageLevel = await this.mapInterpreterLevelToLanguageLevel(pair.interpreterLevel!);

      const languagePair = this.languagePairRepository.create({
        interpreterProfile: interpreterProfile,
        languageFrom: pair.from,
        languageTo: pair.to,
        languageLevel: languageLevel,
        rightToWorkCheck,
      });

      await this.languagePairRepository.save(languagePair);
    }
  }

  public async setCustomInsurance(user: ITokenUserData, dto: CustomInsuranceDto): Promise<void> {
    const isAdminOperation = this.accessControlService.checkAdminRoleForOperation(dto, user);
    const whereCondition: FindOptionsWhere<UserRole> = isAdminOperation
      ? { id: dto.userRoleId }
      : { id: user.userRoleId };

    const userRole = await findOneOrFailTyped<UserRole>(dto.userRoleId ?? user.userRoleId, this.userRoleRepository, {
      select: {
        id: true,
        operatedByCompanyId: true,
        operatedByMainCorporateCompanyId: true,
        address: {
          id: true,
          country: true,
        },
        customInsurance: {
          id: true,
        },
        role: { name: true },
        user: { id: true, email: true },
      },
      where: whereCondition,
      relations: { address: true, customInsurance: true, user: true, role: true },
    });

    await this.accessControlService.authorizeUserRoleForOperation(user, userRole);

    if (!AUSTRALIA_AND_COUNTRIES_WITH_SIMILAR_RULES.includes(userRole?.address?.country as EExtCountry)) {
      throw new ForbiddenException(EInterpretersProfileErrorCodes.PROFILE_AUSTRALIA_NZ_ONLY);
    }

    if (userRole.customInsurance) {
      await this.customInsuranceRepository.update(
        { id: userRole.customInsurance.id },
        {
          insuredParty: dto.insuredParty,
          insuranceCompany: dto.insuranceCompany,
          policyNumber: dto.policyNumber,
          coverageLimit: dto.coverageLimit,
        },
      );
    }

    if (!userRole.customInsurance) {
      const customInsurance = this.customInsuranceRepository.create({ ...dto, userRole });
      await this.customInsuranceRepository.save(customInsurance);
    }

    this.activationTrackingService.checkActivationStepsEnded(userRole).catch((error: Error) => {
      this.lokiLogger.error(`checkActivationStepsEnded error, userRoleId: ${userRole.id}`, error.stack);
    });
  }

  public async getCustomInsurance(user: ITokenUserData, dto: OptionalUUIDParamDto): Promise<CustomInsurance | null> {
    const isAdminOperation = this.accessControlService.checkAdminRoleForOperation(dto, user);
    const whereCondition: FindOptionsWhere<CustomInsurance> = isAdminOperation
      ? { id: dto.id }
      : { userRole: { id: user.userRoleId } };

    const customInsurance = await this.customInsuranceRepository.findOne({
      select: {
        id: true,
        insuredParty: true,
        insuranceCompany: true,
        policyNumber: true,
        coverageLimit: true,
      },
      where: whereCondition,
      relations: { userRole: true },
    });

    return customInsurance;
  }

  public async removeCustomInsurance(id: string, user: ITokenUserData): Promise<void> {
    const customInsurance = await findOneOrFailTyped<CustomInsurance>(id, this.customInsuranceRepository, {
      select: { userRole: { id: true, operatedByCompanyId: true, operatedByMainCorporateCompanyId: true } },
      where: { id },
      relations: { userRole: true },
    });

    await this.accessControlService.authorizeUserRoleForOperation(user, customInsurance.userRole);

    await this.customInsuranceRepository.delete({ id });

    return;
  }

  public async mapInterpreterLevelToLanguageLevel(interpreterLevel: EExtInterpreterLevel): Promise<ELanguageLevel> {
    if (
      interpreterLevel === EExtInterpreterLevel.CERTIFIED_SPECIALIST_HEALTH_INTERPRETER ||
      interpreterLevel === EExtInterpreterLevel.CERTIFIED_SPECIALIST_LEGAL_INTERPRETER ||
      interpreterLevel === EExtInterpreterLevel.CERTIFIED_CONFERENCE_INTERPRETER
    ) {
      return ELanguageLevel.FOUR;
    }

    if (interpreterLevel === EExtInterpreterLevel.CERTIFIED_INTERPRETER) {
      return ELanguageLevel.THREE;
    }

    if (
      interpreterLevel === EExtInterpreterLevel.CERTIFIED_PROVISIONAL_INTERPRETER ||
      interpreterLevel === EExtInterpreterLevel.CERTIFIED_PROVISIONAL_DEAF_INTERPRETER
    ) {
      return ELanguageLevel.TWO;
    }

    if (
      interpreterLevel === EExtInterpreterLevel.RECOGNISED_PRACTISING_INTERPRETER ||
      interpreterLevel === EExtInterpreterLevel.RECOGNISED_PRACTISING_DEAF_INTERPRETER
    ) {
      return ELanguageLevel.ONE;
    }

    return ELanguageLevel.ZERO;
  }

  public async updateInterpreterProfile(
    user: ITokenUserData,
    dto: UpdateInterpreterProfileDto,
  ): Promise<IMessageOutput> {
    const isAdminOperation = this.accessControlService.checkAdminRoleForOperation(dto, user);
    const whereCondition: FindOptionsWhere<UserRole> = isAdminOperation
      ? { id: dto.userRoleId }
      : { id: user.userRoleId };

    const userRole = await this.userRoleRepository.findOne({
      select: {
        id: true,
        operatedByCompanyId: true,
        operatedByMainCorporateCompanyId: true,
        role: { name: true },
        interpreterProfile: { id: true },
        backyCheck: {
          id: true,
          checkStatus: true,
          checkResults: true,
          manualCheckResults: true,
        },
      },
      where: whereCondition,
      relations: { role: true, interpreterProfile: true, backyCheck: true },
    });

    if (!userRole || !userRole.interpreterProfile) {
      throw new NotFoundException(EInterpretersProfileErrorCodes.PROFILE_NOT_FOUND);
    }

    await this.accessControlService.authorizeUserRoleForOperation(user, userRole);
    this.validateWWCCRequirements(dto, userRole);

    const updateData: Partial<InterpreterProfile> = {
      audioOnDemandSetting: dto.audioOnDemandSetting,
      videoOnDemandSetting: dto.videoOnDemandSetting,
      faceToFaceOnDemandSetting: dto.faceToFaceOnDemandSetting,
      audioPreBookedSetting: dto.audioPreBookedSetting,
      videoPreBookedSetting: dto.videoPreBookedSetting,
      faceToFacePreBookedSetting: dto.faceToFacePreBookedSetting,
    };

    if (user.role !== EUserRoleName.IND_LANGUAGE_BUDDY_INTERPRETER) {
      updateData.consecutiveGeneralSetting = dto.consecutiveGeneralSetting;
      updateData.consecutiveLegalSetting = dto.consecutiveLegalSetting;
      updateData.consecutiveMedicalSetting = dto.consecutiveMedicalSetting;
      updateData.conferenceSimultaneousSetting = dto.conferenceSimultaneousSetting;
      updateData.signLanguageSetting = dto.signLanguageSetting;
    }

    await this.interpreterProfileRepository.update(userRole.interpreterProfile.id, updateData);

    return { message: "Interpreter profile updated successfully." };
  }

  public async updateInterpreterLocation(dto: OrderEventDto): Promise<IMessageOutput> {
    if (!dto.id) {
      throw new BadRequestException(EInterpretersProfileErrorCodes.PROFILE_LOCATION_UPDATE_FAILED);
    }

    if (!isUUID(dto.id)) {
      throw new BadRequestException(EInterpretersProfileErrorCodes.PROFILE_INVALID_INTERPRETER_ID);
    }

    const result = await this.interpreterProfileRepository.update(
      { userRole: { id: dto.id } },
      {
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    );

    if (!result.affected || result.affected === 0) {
      throw new BadRequestException(EInterpretersProfileErrorCodes.PROFILE_LOCATION_UPDATE_FAILED);
    } else {
      return { message: "Success" };
    }
  }

  public async updateAverageInterpreterRating(userRole: UserRole, averageRating: number): Promise<void> {
    await this.interpreterProfileRepository.update({ userRole: { id: userRole.id } }, { averageRating });

    if (userRole.interpreterProfile && userRole.interpreterProfile.interpreterBadgePdf) {
      this.interpreterBadgeService.createOrUpdateInterpreterBadgePdf(userRole.id).catch((error: Error) => {
        this.lokiLogger.error(`Failed to update interpreter badge pdf for userRoleId: ${userRole.id}`, error.stack);
      });
    }
  }

  public async updateInterpreterOnlineStatus(user: ITokenUserData, dto: SetInterpreterOnlineDto): Promise<void> {
    const DEFAULT_ONLINE_DURATION_MONTHS = 6;
    const currentTime = new Date();
    const endOfWorkDay =
      dto.endOfWorkDay === null ? addMonths(currentTime, DEFAULT_ONLINE_DURATION_MONTHS) : dto.endOfWorkDay;

    await this.interpreterProfileRepository.update(
      { userRole: { id: user.userRoleId } },
      {
        isOnlineForAudio: dto.isOnlineForAudio,
        isOnlineForVideo: dto.isOnlineForVideo,
        isOnlineForFaceToFace: dto.isOnlineForFaceToFace,
        onlineSince: currentTime,
        offlineSince: null,
        endOfWorkDay,
      },
    );
  }

  public async setInterpreterOffline(user: ITokenUserData): Promise<void> {
    await this.interpreterProfileRepository.update(
      { userRole: { id: user.userRoleId } },
      {
        isOnlineForAudio: false,
        isOnlineForVideo: false,
        isOnlineForFaceToFace: false,
        endOfWorkDay: null,
        onlineSince: null,
        offlineSince: new Date(),
      },
    );
  }

  // TODO: type
  public validateWWCCRequirements(
    dto: UpdateInterpreterProfileDto | CreateInterpreterQuestionnaireDto,
    userRole: UserRole,
  ): void {
    if (!this.requiresWWCCValidation(dto, userRole)) {
      return;
    }

    if (!this.hasValidWWCC(userRole.backyCheck)) {
      throw new BadRequestException(EInterpretersProfileErrorCodes.PROFILE_WWCC_REQUIRED);
    }
  }

  private requiresWWCCValidation(
    dto: UpdateInterpreterProfileDto | CreateInterpreterQuestionnaireDto,
    userRole: UserRole,
  ): boolean {
    const hasFaceToFaceSetting = Boolean(dto.faceToFaceOnDemandSetting || dto.faceToFacePreBookedSetting);
    const isProfessionalInterpreterFromAustralia =
      userRole.role.name === EUserRoleName.IND_PROFESSIONAL_INTERPRETER && userRole.country === EExtCountry.AUSTRALIA;

    return hasFaceToFaceSetting && isProfessionalInterpreterFromAustralia;
  }

  private hasValidWWCC(backyCheck: BackyCheck | null): boolean {
    if (!backyCheck) {
      return false;
    }

    return (
      backyCheck.checkStatus === EExtCheckStatus.READY ||
      backyCheck.checkResults === EExtCheckResult.CLEAR ||
      backyCheck.manualCheckResults === EManualCheckResult.MANUAL_APPROVED
    );
  }
}
