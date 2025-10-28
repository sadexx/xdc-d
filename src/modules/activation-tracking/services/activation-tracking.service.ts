import { BadRequestException, Injectable } from "@nestjs/common";
import { AccountActivationService } from "src/modules/account-activation/services";
import { DocusignService } from "src/modules/docusign/services";
import { ICurrentUserData } from "src/modules/users/common/interfaces";
import { MockService } from "src/modules/mock/services";
import { IStepInformation } from "src/modules/account-activation/common/interfaces";
import { EStepStatus } from "src/modules/account-activation/common/enums";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "src/modules/users/entities";
import { Repository } from "typeorm";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { LokiLogger } from "src/common/logger";
import { ALLOWED_EMPLOYEE_ROLES, INDIVIDUAL_ROLES, LFH_ADMIN_ROLES, MOCK_ENABLED } from "src/common/constants";
import { findOneOrFailTyped, isInRoles } from "src/common/utils";
import { TCheckActivationStepsEndedUserRole } from "src/modules/activation-tracking/common/types";
import { EMockType } from "src/modules/mock/common/enums";
import { EActivationTrackingErrorCodes } from "src/modules/activation-tracking/common/enums";

@Injectable()
export class ActivationTrackingService {
  private readonly lokiLogger = new LokiLogger(ActivationTrackingService.name);

  public constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly accountActivationService: AccountActivationService,
    private readonly docusignService: DocusignService,
    private readonly mockService: MockService,
  ) {}

  public async checkActivationStepsEnded(userRole: TCheckActivationStepsEndedUserRole): Promise<void> {
    const currentUserData: ICurrentUserData = {
      id: userRole.user.id,
      userRoleId: userRole.id,
      email: userRole.user.email,
      role: userRole.role.name,
      isActive: userRole.isActive,
    };
    await this.checkStepsEnded(currentUserData);
  }

  private async checkStepsEnded(currentUser: ICurrentUserData): Promise<void> {
    try {
      if (currentUser.isActive) {
        throw new BadRequestException(EActivationTrackingErrorCodes.USER_ALREADY_ACTIVATED);
      }

      if (!currentUser.id || !currentUser.role) {
        throw new BadRequestException(EActivationTrackingErrorCodes.USER_NOT_FOUND);
      }

      if (!isInRoles([...LFH_ADMIN_ROLES, ...INDIVIDUAL_ROLES, ...ALLOWED_EMPLOYEE_ROLES], currentUser.role)) {
        return;
      }

      const neededSteps = await this.accountActivationService.retrieveRequiredAndActivationSteps(currentUser);
      const isNeedContract = !!neededSteps?.docusignContractFulfilled;
      const isContractStarted = neededSteps?.docusignContractFulfilled?.status !== EStepStatus.NOT_STARTED;
      let isSomeStepsNotEnded = false;

      delete neededSteps.docusignContractFulfilled;

      Object.keys(neededSteps).forEach((stepName) => {
        const step = (neededSteps as unknown as Record<string, IStepInformation>)[stepName];

        if (step.isBlockAccountActivation) {
          if (step.status !== EStepStatus.SUCCESS) {
            isSomeStepsNotEnded = true;
          }
        }
      });

      if (isSomeStepsNotEnded) {
        return;
      }

      const userInfo = await findOneOrFailTyped<User>(currentUser.id, this.userRepository, {
        where: { id: currentUser.id, userRoles: { role: { name: currentUser.role } } },
      });

      // TODO: Refactor as ITokenUserData after docusign refactoring
      if (isNeedContract && !isContractStarted) {
        if (MOCK_ENABLED) {
          if (this.mockService.mockEmails.includes(userInfo.email)) {
            await this.mockService.processMock({
              type: EMockType.CREATE_AND_SEND_CONTRACT,
              data: { user: currentUser as ITokenUserData },
            });
            this.checkStepsEnded(currentUser).catch((error: Error) => {
              this.lokiLogger.error(`checkStepsEnded error, userId: ${currentUser.id}`, error.stack);
              throw new BadRequestException(error);
            });
          }

          if (!this.mockService.mockEmails.includes(userInfo.email)) {
            await this.docusignService.createAndSendContract(currentUser as ITokenUserData);
          }
        } else {
          await this.docusignService.createAndSendContract(currentUser as ITokenUserData);
        }

        return;
      }

      if ((isNeedContract && isContractStarted) || !isNeedContract) {
        const activationResult = await this.accountActivationService.activateAccount(currentUser);

        if (activationResult?.failedActivationCriteria) {
          this.lokiLogger.error(activationResult.failedActivationCriteria);
        }

        return;
      }
    } catch (error) {
      this.lokiLogger.error(`Error while checking steps for user: ${(error as Error).message}`, (error as Error).stack);
    }
  }
}
