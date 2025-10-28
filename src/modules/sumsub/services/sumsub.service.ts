import { BadRequestException, Injectable } from "@nestjs/common";
import { SumSubCheck } from "src/modules/sumsub/entities";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOneOptions, FindOptionsWhere, Repository } from "typeorm";
import { GetSumSubAccessTokenQueryDto, GetSumSubQueryDto } from "src/modules/sumsub/common/dto";
import {
  EExtSumSubApplicantType,
  EExtSumSubLevelName,
  EExtSumSubReviewAnswer,
  EExtSumSubReviewStatus,
  EExtSumSubWebhookType,
  ESumSubErrorCodes,
} from "src/modules/sumsub/common/enums";
import { ActivationTrackingService } from "src/modules/activation-tracking/services";
import { randomUUID } from "node:crypto";
import { OptionalUUIDParamDto } from "src/common/dto";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { SumSubSdkService } from "src/modules/sumsub/services";
import { GetUserAccessTokenOutput } from "src/modules/sumsub/common/outputs";
import { findOneOrFail } from "src/common/utils";
import { LokiLogger } from "src/common/logger";
import { UserRole } from "src/modules/users/entities";
import { AccessControlService } from "src/modules/access-control/services";

@Injectable()
export class SumSubService {
  private readonly lokiLogger = new LokiLogger(SumSubService.name);
  constructor(
    @InjectRepository(SumSubCheck)
    private readonly sumSubCheckRepository: Repository<SumSubCheck>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly sumSubSdkService: SumSubSdkService,
    private readonly activationTrackingService: ActivationTrackingService,
    private readonly accessControlService: AccessControlService,
  ) {}

  public async getUserAccessToken(
    user: ITokenUserData,
    dto: GetSumSubAccessTokenQueryDto,
  ): Promise<GetUserAccessTokenOutput> {
    const token = await this.sumSubSdkService.fetchAccessToken(user.userRoleId, dto.levelName);

    return { token };
  }

  public async getAll(dto: GetSumSubQueryDto): Promise<SumSubCheck[]> {
    const sumSubChecks = await this.sumSubCheckRepository.find({
      take: dto.limit,
      skip: dto.offset,
      order: {
        creationDate: dto.sortOrder,
      },
    });

    return sumSubChecks;
  }

  public async getUserStatus(user: ITokenUserData, dto: OptionalUUIDParamDto): Promise<SumSubCheck | null> {
    const isLfhAdminOperation = this.accessControlService.checkLfhAdminRoleForOperation(user);
    const whereConditions: FindOptionsWhere<SumSubCheck> = isLfhAdminOperation
      ? { id: dto.id }
      : { userRole: { id: user.userRoleId } };

    return await this.sumSubCheckRepository.findOne({
      where: whereConditions,
    });
  }

  public async removeSumSubCheck(id: string): Promise<void> {
    const sumSubCheck = await findOneOrFail(id, this.sumSubCheckRepository, {
      where: { id },
    });

    await this.sumSubSdkService.resetApplicant(sumSubCheck.applicantId);
    await this.sumSubCheckRepository.remove(sumSubCheck);

    return;
  }

  public async mockSumSub(user: ITokenUserData): Promise<{
    id: string;
  }> {
    const queryOptions: FindOneOptions<UserRole> = {
      select: { id: true, isActive: true },
      where: { id: user.userRoleId },
      relations: { user: true, role: true },
    };
    const userRole = await this.userRoleRepository.findOneOrFail(queryOptions);

    if (userRole.isActive) {
      throw new BadRequestException(ESumSubErrorCodes.OPERATION_NOT_PERMITTED);
    }

    const sumSubCheck = this.sumSubCheckRepository.create({
      userRole,
      applicantId: randomUUID(),
      inspectionId: randomUUID(),
      applicantType: EExtSumSubApplicantType.INDIVIDUAL,
      correlationId: randomUUID(),
      levelName: EExtSumSubLevelName.AUSTRALIA_OR_NZ_CITIZENS,
      sandboxMode: true,
      externalUserId: user.id,
      webhookType: EExtSumSubWebhookType.APPLICANT_REVIEWED,
      reviewStatus: EExtSumSubReviewStatus.COMPLETED,
      reviewAnswer: EExtSumSubReviewAnswer.GREEN,
    });
    const newSumSubCheck = await this.sumSubCheckRepository.save(sumSubCheck);

    this.activationTrackingService.checkActivationStepsEnded(userRole).catch((error: Error) => {
      this.lokiLogger.error(`checkActivationStepsEnded error, userRoleId: ${userRole.id}`, error.stack);
    });

    return { id: newSumSubCheck.id };
  }
}
