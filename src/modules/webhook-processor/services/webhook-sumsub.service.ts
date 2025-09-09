import { BadRequestException, Injectable } from "@nestjs/common";
import { ICreateSumSubCheck, ISumSubMessageWithReview } from "src/modules/sumsub/common/interfaces";
import { SumSubCheck } from "src/modules/sumsub/entities";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Message } from "@aws-sdk/client-sqs";
import { UserRole } from "src/modules/users/entities";
import { isUUID } from "class-validator";
import { EExtSumSubReviewAnswer } from "src/modules/sumsub/common/enums";
import { ActivationTrackingService } from "src/modules/activation-tracking/services";
import { LokiLogger } from "src/common/logger";
import { SumSubSdkService } from "src/modules/sumsub/services";
import { ConfigService } from "@nestjs/config";
import { MockService } from "src/modules/mock/services";

@Injectable()
export class WebhookSumSubService {
  private readonly lokiLogger = new LokiLogger(WebhookSumSubService.name);
  constructor(
    @InjectRepository(SumSubCheck)
    private readonly sumSubCheckRepository: Repository<SumSubCheck>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly sumSubSdkService: SumSubSdkService,
    private readonly activationTrackingService: ActivationTrackingService,
    private readonly configService: ConfigService,
    private readonly mockService: MockService,
  ) {}

  public async processSumSubWebhook(message: Message): Promise<void> {
    const sumSubMessage = JSON.parse(message.Body!) as ISumSubMessageWithReview;

    if (!isUUID(sumSubMessage.externalUserId)) {
      this.lokiLogger.error(`Invalid UUID format for externalUserId: ${sumSubMessage.externalUserId}`);

      return;
    }

    const userRole = await this.userRoleRepository.findOne({
      where: { id: sumSubMessage.externalUserId },
      relations: { role: true, user: true },
    });

    if (!userRole) {
      this.lokiLogger.error(`User role with id: ${sumSubMessage.externalUserId}, from SumSub not found`);

      return;
    }

    let sumSubCheck = await this.sumSubCheckRepository.findOne({
      where: { externalUserId: sumSubMessage.externalUserId },
    });

    const sumSubCheckDto = this.constructSumSubCheckDto(userRole, sumSubMessage);

    if (!sumSubCheck) {
      const createSumSubCheck = this.sumSubCheckRepository.create(sumSubCheckDto);
      sumSubCheck = await this.sumSubCheckRepository.save(createSumSubCheck);
    } else {
      await this.sumSubCheckRepository.update(sumSubCheck.id, sumSubCheckDto);
    }

    if (sumSubMessage.reviewResult && sumSubMessage.reviewResult.reviewAnswer === EExtSumSubReviewAnswer.GREEN) {
      await this.validateAndProcessApplicant(sumSubMessage, userRole, sumSubCheck);
    }
  }

  private constructSumSubCheckDto(userRole: UserRole, sumSubMessage: ISumSubMessageWithReview): ICreateSumSubCheck {
    return {
      userRole: userRole,
      applicantId: sumSubMessage.applicantId,
      inspectionId: sumSubMessage.inspectionId,
      applicantType: sumSubMessage.applicantType,
      correlationId: sumSubMessage.correlationId,
      levelName: sumSubMessage.levelName,
      sandboxMode: sumSubMessage.sandboxMode ?? false,
      externalUserId: sumSubMessage.externalUserId,
      webhookType: sumSubMessage.type,
      reviewStatus: sumSubMessage.reviewStatus,
      moderationComment: sumSubMessage.reviewResult?.moderationComment ?? null,
      clientComment: sumSubMessage.reviewResult?.clientComment ?? null,
      reviewAnswer: sumSubMessage.reviewResult?.reviewAnswer ?? null,
      rejectLabels: sumSubMessage.reviewResult?.rejectLabels ?? [],
      reviewRejectType: sumSubMessage.reviewResult?.reviewRejectType ?? null,
      buttonIds: sumSubMessage.reviewResult?.buttonIds ?? [],
    };
  }

  private async validateAndProcessApplicant(
    sumSubMessage: ISumSubMessageWithReview,
    userRole: UserRole,
    sumSubCheck: SumSubCheck,
  ): Promise<void> {
    try {
      const applicantData = await this.sumSubSdkService.getApplicantData(sumSubMessage.applicantId);
      const { firstName: applicantFirstName, lastName: applicantLastName } = applicantData.info;

      let profileFirstName: string;
      let profileLastName: string;

      const mockEnabled = this.configService.getOrThrow<boolean>("mockEnabled");

      if (mockEnabled) {
        [profileFirstName, profileLastName] = this.mockService.mockSumSubFullName.split(" ");
      } else {
        ({ firstName: profileFirstName, lastName: profileLastName } = userRole.profile);
      }

      if (
        applicantFirstName.toLowerCase() !== profileFirstName.toLowerCase() ||
        applicantLastName.toLowerCase() !== profileLastName.toLowerCase()
      ) {
        throw new BadRequestException("The name from SumSub does not match the name entered by the user.");
      }

      this.activationTrackingService.checkActivationStepsEnded(userRole).catch((error: Error) => {
        this.lokiLogger.error(`checkActivationStepsEnded error, userRoleId: ${userRole.id}`, error.stack);
      });
    } catch (error) {
      await this.sumSubCheckRepository.update(sumSubCheck.id, {
        reviewAnswer: EExtSumSubReviewAnswer.RED,
      });
      this.lokiLogger.error(
        `Error while processing SumSub applicant: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
