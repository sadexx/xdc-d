import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, Repository } from "typeorm";
import { ActivationTrackingService } from "src/modules/activation-tracking/services";
import { InterpreterProfileService } from "src/modules/interpreters/profile/services";
import { InterpreterQuestionnaire } from "src/modules/interpreters/questionnaire/entities";
import {
  CreateInterpreterQuestionnaireDto,
  CreateInterpreterQuestionnaireServicesLanguageBuddyDto,
  GetInterpreterQuestionnaireDto,
  UpdateInterpreterQuestionnaireDto,
} from "src/modules/interpreters/questionnaire/common/dto";
import { EInterpreterCertificateType, EInterpreterType } from "src/modules/interpreters/profile/common/enum";
import { IInterpreterProfile } from "src/modules/interpreters/profile/common/interface";
import { UserRole } from "src/modules/users/entities";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { IMessageOutput } from "src/common/outputs";
import { LokiLogger } from "src/common/logger";
import { AccessControlService } from "src/modules/access-control/services";

@Injectable()
export class InterpreterQuestionnaireService {
  private readonly lokiLogger = new LokiLogger(InterpreterQuestionnaireService.name);
  constructor(
    @InjectRepository(InterpreterQuestionnaire)
    private readonly interpreterQuestionnaireRepository: Repository<InterpreterQuestionnaire>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly activationTrackingService: ActivationTrackingService,
    private readonly interpreterProfileService: InterpreterProfileService,
    private readonly accessControlService: AccessControlService,
  ) {}

  public async create(user: ITokenUserData, dto: CreateInterpreterQuestionnaireDto): Promise<IMessageOutput> {
    const isAdminOperation = this.accessControlService.checkAdminRoleForOperation(dto, user);
    const whereCondition: FindOptionsWhere<UserRole> = isAdminOperation
      ? { id: dto.userRoleId }
      : { id: user.userRoleId };

    const userRole = await this.userRoleRepository.findOne({
      select: {
        id: true,
        operatedByCompanyId: true,
        operatedByMainCorporateCompanyId: true,
        isActive: true,
        role: { name: true },
        questionnaire: { id: true },
        backyCheck: {
          id: true,
          checkStatus: true,
          checkResults: true,
          manualCheckResults: true,
        },
        user: { id: true, email: true },
      },
      where: whereCondition,
      relations: { role: true, questionnaire: true, backyCheck: true, user: true },
    });

    if (!userRole) {
      throw new NotFoundException("User role not found");
    }

    await this.accessControlService.authorizeUserRoleForOperation(user, userRole);

    if (userRole.questionnaire) {
      throw new BadRequestException("Questionnaire is already created");
    }

    this.interpreterProfileService.validateWWCCRequirements(dto, userRole);

    const questionnaire = this.interpreterQuestionnaireRepository.create({
      userRoleId: userRole.id,
      experienceYears: dto.experienceYears,
    });

    await this.interpreterQuestionnaireRepository.save(questionnaire);

    await this.createOrUpdateInterpreterProfile(userRole, dto);

    this.activationTrackingService.checkActivationStepsEnded(userRole).catch((error: Error) => {
      this.lokiLogger.error(`checkActivationStepsEnded error, userRoleId: ${userRole.id}`, error.stack);
    });

    return { message: "Questionnaire created successfully." };
  }

  public async createServices(
    user: ITokenUserData,
    dto: CreateInterpreterQuestionnaireServicesLanguageBuddyDto,
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
        isActive: true,
        questionnaire: { id: true },
      },
      where: whereCondition,
      relations: { questionnaire: true, role: true, user: true },
    });

    if (!userRole) {
      throw new NotFoundException("User role not found");
    }

    await this.accessControlService.authorizeUserRoleForOperation(user, userRole);

    if (userRole.questionnaire) {
      throw new BadRequestException("Questionnaire is already created");
    }

    const questionnaire = this.interpreterQuestionnaireRepository.create({
      userRoleId: userRole.id,
    });

    await this.interpreterQuestionnaireRepository.save(questionnaire);

    await this.createOrUpdateInterpreterProfile(userRole, dto);

    this.activationTrackingService.checkActivationStepsEnded(userRole).catch((error: Error) => {
      this.lokiLogger.error(`checkActivationStepsEnded error, userRoleId: ${userRole.id}`, error.stack);
    });

    return { message: "Questionnaire created successfully." };
  }

  public async findOneByUserIdAndRole(
    dto: GetInterpreterQuestionnaireDto,
    user: ITokenUserData,
  ): Promise<InterpreterQuestionnaire> {
    const isAdminOperation = this.accessControlService.checkAdminRoleForOperation(dto, user);
    const whereCondition: FindOptionsWhere<UserRole> = isAdminOperation
      ? { id: dto.userRoleId }
      : { id: user.userRoleId };

    const userRole = await this.userRoleRepository.findOne({
      select: {
        id: true,
        operatedByCompanyId: true,
        operatedByMainCorporateCompanyId: true,
        questionnaire: { id: true, experienceYears: true, recommendations: true },
      },
      where: whereCondition,
      relations: { questionnaire: { recommendations: true } },
    });

    if (!userRole) {
      throw new NotFoundException("User role not found");
    }

    await this.accessControlService.authorizeUserRoleForOperation(user, userRole);

    if (!userRole.questionnaire) {
      throw new NotFoundException("Can't find questionnaire with such user id and role");
    }

    return userRole.questionnaire;
  }

  public async update(user: ITokenUserData, dto: UpdateInterpreterQuestionnaireDto): Promise<IMessageOutput> {
    const isAdminOperation = this.accessControlService.checkAdminRoleForOperation(dto, user);
    const whereCondition: FindOptionsWhere<UserRole> = isAdminOperation
      ? { id: dto.userRoleId }
      : { id: user.userRoleId };

    const userRole = await this.userRoleRepository.findOne({
      select: {
        id: true,
        operatedByCompanyId: true,
        operatedByMainCorporateCompanyId: true,
        isActive: true,
        questionnaire: { id: true },
      },
      where: whereCondition,
      relations: { questionnaire: true, user: true, role: true },
    });

    if (!userRole || !userRole.questionnaire) {
      throw new NotFoundException("User role not found");
    }

    await this.accessControlService.authorizeUserRoleForOperation(user, userRole);
    await this.interpreterQuestionnaireRepository.update(userRole.questionnaire.id, {
      experienceYears: dto.experienceYears,
    });

    this.activationTrackingService.checkActivationStepsEnded(userRole).catch((error: Error) => {
      this.lokiLogger.error(`checkActivationStepsEnded error, userRoleId: ${userRole.id}`, error.stack);
    });

    return { message: "Questionnaire updated successfully." };
  }

  public async createOrUpdateInterpreterProfile(
    userRole: UserRole,
    dto: CreateInterpreterQuestionnaireDto | CreateInterpreterQuestionnaireServicesLanguageBuddyDto,
  ): Promise<void> {
    const interpreterProfile: IInterpreterProfile = {
      type: [EInterpreterType.INTERPRETER],
      certificateType: EInterpreterCertificateType.OTHER,
      knownLanguages: [],
      audioOnDemandSetting: dto.audioOnDemandSetting,
      videoOnDemandSetting: dto.videoOnDemandSetting,
      faceToFaceOnDemandSetting: dto.faceToFaceOnDemandSetting,
      audioPreBookedSetting: dto.audioPreBookedSetting,
      videoPreBookedSetting: dto.videoPreBookedSetting,
      faceToFacePreBookedSetting: dto.faceToFacePreBookedSetting,
    };

    if (dto instanceof CreateInterpreterQuestionnaireDto) {
      Object.assign(interpreterProfile, {
        consecutiveLegalSetting: dto.consecutiveLegalSetting,
        consecutiveMedicalSetting: dto.consecutiveMedicalSetting,
        conferenceSimultaneousSetting: dto.conferenceSimultaneousSetting,
        signLanguageSetting: dto.signLanguageSetting,
        consecutiveGeneralSetting: dto.consecutiveGeneralSetting,
      });
    }

    if (dto instanceof CreateInterpreterQuestionnaireServicesLanguageBuddyDto) {
      Object.assign(interpreterProfile, {
        consecutiveGeneralSetting: dto.consecutiveGeneralSetting,
      });
    }

    await this.interpreterProfileService.createOrUpdateInterpreterProfile(userRole.id, interpreterProfile);
  }
}
