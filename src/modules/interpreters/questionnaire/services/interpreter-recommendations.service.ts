import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, Repository } from "typeorm";
import { InterpreterRecommendation } from "src/modules/interpreters/questionnaire/entities";
import {
  CreateInterpreterRecommendationDto,
  UpdateInterpreterRecommendationDto,
} from "src/modules/interpreters/questionnaire/common/dto";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { IMessageOutput } from "src/common/outputs";
import { AccessControlService } from "src/modules/access-control/services";
import { UserRole } from "src/modules/users/entities";
import { findOneOrFailTyped } from "src/common/utils";
import { EInterpreterQuestionnaireErrorCodes } from "src/modules/interpreters/questionnaire/common/enum";

@Injectable()
export class InterpreterRecommendationsService {
  constructor(
    @InjectRepository(InterpreterRecommendation)
    private readonly interpreterRecommendationRepository: Repository<InterpreterRecommendation>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly accessControlService: AccessControlService,
  ) {}

  public async createRecommendation(
    dto: CreateInterpreterRecommendationDto,
    user: ITokenUserData,
  ): Promise<IMessageOutput> {
    const isAdminOperation = this.accessControlService.checkAdminRoleForOperation(dto, user);
    const whereCondition: FindOptionsWhere<UserRole> = isAdminOperation
      ? { id: dto.userRoleId }
      : { id: user.userRoleId };

    const userRole = await findOneOrFailTyped<UserRole>(dto.userRoleId ?? user.userRoleId, this.userRoleRepository, {
      select: {
        id: true,
        operatedByCompanyId: true,
        operatedByMainCorporateCompanyId: true,
        questionnaire: { id: true },
      },
      where: whereCondition,
      relations: { questionnaire: true },
    });

    if (!userRole.questionnaire) {
      throw new NotFoundException(EInterpreterQuestionnaireErrorCodes.COMMON_QUESTIONNAIRE_NOT_FOUND);
    }

    await this.accessControlService.authorizeUserRoleForOperation(user, userRole);

    const recommendation = this.interpreterRecommendationRepository.create({
      ...dto,
      questionnaire: userRole.questionnaire,
    });

    await this.interpreterRecommendationRepository.save(recommendation);

    return { message: "Recommendation created successfully." };
  }

  public async updateRecommendation(
    id: string,
    dto: UpdateInterpreterRecommendationDto,
    user: ITokenUserData,
  ): Promise<IMessageOutput> {
    const isAdminOperation = this.accessControlService.checkAdminRoleForOperation(dto, user);
    const whereCondition: FindOptionsWhere<UserRole> = isAdminOperation
      ? { id: dto.userRoleId, questionnaire: { recommendations: { id } } }
      : { id: user.userRoleId, questionnaire: { recommendations: { id } } };

    const userRole = await findOneOrFailTyped<UserRole>(dto.userRoleId ?? user.userRoleId, this.userRoleRepository, {
      select: {
        id: true,
        operatedByCompanyId: true,
        operatedByMainCorporateCompanyId: true,
        questionnaire: { id: true, recommendations: { id: true } },
      },
      where: whereCondition,
      relations: { questionnaire: { recommendations: true } },
    });

    if (!userRole.questionnaire) {
      throw new NotFoundException(EInterpreterQuestionnaireErrorCodes.COMMON_QUESTIONNAIRE_NOT_FOUND);
    }

    await this.accessControlService.authorizeUserRoleForOperation(user, userRole);

    if (userRole.questionnaire.recommendations.length === 0) {
      throw new NotFoundException(EInterpreterQuestionnaireErrorCodes.RECOMMENDATIONS_RECOMMENDATION_NOT_FOUND);
    }

    await this.interpreterRecommendationRepository.update(id, {
      companyName: dto.companyName,
      recommenderFullName: dto.recommenderFullName,
      recommenderPhoneNumber: dto.recommenderPhoneNumber,
      recommenderEmail: dto.recommenderEmail,
    });

    return { message: "Recommendation updated successfully." };
  }

  public async deleteRecommendation(id: string, user: ITokenUserData): Promise<void> {
    const recommendation = await findOneOrFailTyped<InterpreterRecommendation>(
      id,
      this.interpreterRecommendationRepository,
      {
        select: {
          id: true,
          questionnaire: {
            id: true,
            userRole: { id: true, operatedByCompanyId: true, operatedByMainCorporateCompanyId: true },
          },
        },
        where: { id },
        relations: { questionnaire: { userRole: true } },
      },
    );

    await this.accessControlService.authorizeUserRoleForOperation(user, recommendation.questionnaire.userRole);

    await this.interpreterRecommendationRepository.remove(recommendation);

    return;
  }
}
