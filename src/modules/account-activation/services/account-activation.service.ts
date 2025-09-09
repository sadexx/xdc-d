import { BadRequestException, ForbiddenException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { EAccountStatus, EUserRoleName } from "src/modules/users/common/enums";
import { ICurrentUserData } from "src/modules/users/common/interfaces";
import { User } from "src/modules/users/entities";
import {
  ICustomFindOptionsRelations,
  IFetchUserAndEvaluateRequiredAndActivationSteps,
  IStepInformation,
} from "src/modules/account-activation/common/interfaces";
import {
  FinishAccountActivationStepsOutput,
  FinishCompanyActivationStepsOutput,
  IAccountRequiredStepsDataOutput,
} from "src/modules/account-activation/common/outputs";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SessionsService } from "src/modules/sessions/services";
import { EStepStatus } from "src/modules/account-activation/common/enums";
import { AccountActivationQueryOptionsService, StepInfoService } from "src/modules/account-activation/services";
import { UserRole } from "src/modules/users/entities";
import { OneRoleLoginOutput } from "src/modules/auth/common/outputs";
import { NotificationService } from "src/modules/notifications/services";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { LokiLogger } from "src/common/logger";
import { EmailsService } from "src/modules/emails/services";
import { ConfigService } from "@nestjs/config";
import { HelperService } from "src/modules/helper/services";
import { AccessControlService } from "src/modules/access-control/services";
import { findOneOrFailTyped } from "src/common/utils";
import {
  TActivateByAdmin,
  TDeactivate,
  TFetchUserAndEvaluateRequiredAndActivationSteps,
  TFetchUserAndEvaluateRequiredAndActivationStepsUserRole,
  TProcessAccountActivation,
  TRetrieveRequiredAndActivationSteps,
} from "src/modules/account-activation/common/types";

@Injectable()
export class AccountActivationService {
  private readonly lokiLogger = new LokiLogger(AccountActivationService.name);
  private readonly FRONT_END_URL: string;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly accountActivationQueryOptionsService: AccountActivationQueryOptionsService,
    private readonly sessionsService: SessionsService,
    private readonly stepInfoService: StepInfoService,
    private readonly notificationService: NotificationService,
    private readonly emailsService: EmailsService,
    private readonly configService: ConfigService,
    private readonly helperService: HelperService,
    private readonly accessControlService: AccessControlService,
  ) {
    this.FRONT_END_URL = this.configService.getOrThrow<string>("frontend.uri");
  }

  public async retrieveRequiredAndActivationSteps(
    currentUser: TRetrieveRequiredAndActivationSteps,
  ): Promise<IAccountRequiredStepsDataOutput> {
    if (!currentUser.id || !currentUser.role) {
      throw new BadRequestException("User not found");
    }

    const { accountActivationSteps } = await this.fetchUserAndEvaluateRequiredAndActivationSteps(
      currentUser.id,
      currentUser.role,
    );

    return accountActivationSteps;
  }

  public async fetchUserAndEvaluateRequiredAndActivationSteps(
    userId: string,
    userRoleName: EUserRoleName,
  ): Promise<IFetchUserAndEvaluateRequiredAndActivationSteps> {
    const relations = await this.getRelations(userId, userRoleName);
    const queryOptions = this.accountActivationQueryOptionsService.fetchUserAndEvaluateRequiredAndActivationSteps(
      userId,
      userRoleName,
      relations,
    );

    const user = await findOneOrFailTyped<TFetchUserAndEvaluateRequiredAndActivationSteps>(
      userId,
      this.userRepository,
      queryOptions,
    );
    const userRole =
      await this.helperService.getUserRoleByName<TFetchUserAndEvaluateRequiredAndActivationStepsUserRole>(
        user,
        userRoleName,
      );

    const accountActivationSteps: IAccountRequiredStepsDataOutput = this.getSteps(userRole, userRoleName);

    return { user, userRole, accountActivationSteps };
  }

  public async activateAccount(currentUser: ICurrentUserData): Promise<FinishAccountActivationStepsOutput> {
    if (!currentUser.id || !currentUser.role) {
      throw new BadRequestException("User not found.");
    }

    const { user, userRole, accountActivationSteps } = await this.fetchUserAndEvaluateRequiredAndActivationSteps(
      currentUser.id,
      currentUser.role,
    );

    if (userRole.isRequiredInfoFulfilled && userRole.isActive) {
      throw new BadRequestException("Your account is already active.");
    }

    const failedActivationCriteria = await this.processAccountActivation(userRole, accountActivationSteps);
    const tokens = await this.startSession(user, currentUser, userRole);

    return failedActivationCriteria ? { ...tokens, failedActivationCriteria } : tokens;
  }

  public async activateByAdmin(userRoleId: string, user: ITokenUserData): Promise<FinishCompanyActivationStepsOutput> {
    const queryOptions = this.accountActivationQueryOptionsService.activateByAdminOptions(userRoleId);
    const targetUserRole = await findOneOrFailTyped<TActivateByAdmin>(
      userRoleId,
      this.userRoleRepository,
      queryOptions,
    );

    const { userRole, accountActivationSteps } = await this.fetchUserAndEvaluateRequiredAndActivationSteps(
      targetUserRole.userId,
      targetUserRole.role.name,
    );

    if (userRole.isRequiredInfoFulfilled && userRole.isActive) {
      throw new BadRequestException("This account is already active.");
    }

    await this.accessControlService.authorizeUserRoleForOperation(user, userRole);

    const failedActivationCriteria = await this.processAccountActivation(userRole, accountActivationSteps);

    return { failedActivationCriteria };
  }

  private async processAccountActivation(
    userRole: TProcessAccountActivation,
    accountActivationSteps: IAccountRequiredStepsDataOutput,
  ): Promise<string | null> {
    const checkActivationCriteriaResult = this.checkActivationCriteria(accountActivationSteps);

    if (checkActivationCriteriaResult.failed.length > 0) {
      this.throwRequiredInfoException(checkActivationCriteriaResult);
    }

    let failedActivationCriteria: string | null = null;
    let isAccountActive = false;

    const updateData: Partial<TProcessAccountActivation> = {
      isRequiredInfoFulfilled: checkActivationCriteriaResult.passed.length > 0,
    };

    if (checkActivationCriteriaResult.failed.length === 0) {
      updateData.isActive = true;
      updateData.accountStatus = EAccountStatus.ACTIVE;
      updateData.lastDeactivationDate = null;
      isAccountActive = true;
    } else {
      failedActivationCriteria = `Account is inactive. Missed activation steps: ${checkActivationCriteriaResult.failed.join(", ")}`;
    }

    await this.userRoleRepository.update(userRole.id, updateData);

    if (isAccountActive) {
      await this.notifyUserAboutActivation(userRole);
    }

    return failedActivationCriteria;
  }

  public async deactivate(userRoleId: string, user: ITokenUserData): Promise<void> {
    const queryOptions = this.accountActivationQueryOptionsService.deactivateOptions(userRoleId);
    const userRole = await findOneOrFailTyped<TDeactivate>(userRoleId, this.userRoleRepository, queryOptions);

    if (!userRole.isActive) {
      throw new BadRequestException("This user role is not active");
    }

    await this.accessControlService.authorizeUserRoleForOperation(user, userRole);

    await this.userRoleRepository.update(
      { id: userRole.id },
      { isActive: false, accountStatus: EAccountStatus.DEACTIVATED, lastDeactivationDate: new Date() },
    );

    await this.notifyUserAboutDeactivation(userRole);

    return;
  }

  private throwRequiredInfoException(criteria: { passed: string[]; failed: string[] }): void {
    let message = `Required information wasn't provided.`;

    if (criteria.passed.length > 0) {
      message += ` Passed steps: ${criteria.passed.join(", ")}.`;
    }

    message += ` Missed steps: ${criteria.failed.join(", ")}`;
    throw new ForbiddenException(message);
  }

  private async startSession(
    user: TFetchUserAndEvaluateRequiredAndActivationSteps,
    currentUser: ICurrentUserData,
    userRole: TFetchUserAndEvaluateRequiredAndActivationStepsUserRole,
  ): Promise<OneRoleLoginOutput> {
    if (
      !currentUser.clientUserAgent ||
      !currentUser.clientIPAddress ||
      !currentUser.platform ||
      !currentUser.deviceId ||
      !currentUser.deviceToken ||
      !currentUser.iosVoipToken
    ) {
      const lastSession = await this.sessionsService.getLastSession(user.id);

      if (!lastSession) {
        throw new ServiceUnavailableException("Last session does not exist, re-login, please");
      }

      currentUser.platform = lastSession.platform;
      currentUser.deviceId = lastSession.deviceId;
      currentUser.deviceToken = lastSession.deviceToken;
      currentUser.iosVoipToken = lastSession.iosVoipToken;
      currentUser.clientUserAgent = lastSession.clientUserAgent;
      currentUser.clientIPAddress = lastSession.clientIPAddress;
    }

    if (!currentUser.clientIPAddress || !currentUser.clientUserAgent) {
      throw new BadRequestException("Client IP address and user agent are required");
    }

    if (!currentUser.platform || !currentUser.deviceId) {
      throw new BadRequestException("Client platform, device id and device token are required");
    }

    return await this.sessionsService.updateActiveSession({
      userId: user.id,
      userRoleId: userRole.id,
      userRole: currentUser.role,
      isRequiredInfoFulfilled: userRole.isRequiredInfoFulfilled,
      isActive: userRole.isActive,
      platform: currentUser.platform,
      deviceId: currentUser.deviceId,
      deviceToken: currentUser.deviceToken,
      iosVoipToken: currentUser.iosVoipToken,
      clientUserAgent: currentUser.clientUserAgent,
      clientIPAddress: currentUser.clientIPAddress,
      isUpdateFirstStageToken: true,
    });
  }

  private checkActivationCriteria(accountActivationSteps: IAccountRequiredStepsDataOutput): {
    passed: string[];
    failed: string[];
  } {
    const passed: string[] = [];
    const failed: string[] = [];

    Object.keys(accountActivationSteps).forEach((stepName) => {
      const step = (accountActivationSteps as unknown as Record<string, IStepInformation>)[stepName];

      if (step.isBlockAccountActivation) {
        if (step.status === EStepStatus.SUCCESS) {
          passed.push(stepName);
        }

        if (step.status !== EStepStatus.SUCCESS) {
          failed.push(stepName);
        }
      }
    });

    return { passed, failed };
  }

  public async getRelations(
    userId: string,
    userRoleName: EUserRoleName,
    country?: string,
  ): Promise<ICustomFindOptionsRelations> {
    if (userRoleName === EUserRoleName.IND_LANGUAGE_BUDDY_INTERPRETER) {
      return await this.stepInfoService.getIndLanguageBuddyInterpreterRelations(userId, userRoleName, country);
    }

    if (userRoleName === EUserRoleName.IND_PROFESSIONAL_INTERPRETER) {
      return await this.stepInfoService.getIndPersonalInterpreterRelations(userId, userRoleName, country);
    }

    if (userRoleName === EUserRoleName.IND_CLIENT) {
      return this.stepInfoService.getIndClientRelations();
    }

    if (userRoleName === EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_IND_INTERPRETER) {
      return this.stepInfoService.getCorporateInterpreterRelations();
    }

    return this.stepInfoService.getOtherRolesRelations();
  }

  private getSteps(
    userRole: TFetchUserAndEvaluateRequiredAndActivationStepsUserRole,
    userRoleName: EUserRoleName,
  ): IAccountRequiredStepsDataOutput {
    if (userRoleName === EUserRoleName.IND_LANGUAGE_BUDDY_INTERPRETER) {
      return this.stepInfoService.getIndLanguageBuddyInterpreterSteps(userRole);
    }

    if (userRoleName === EUserRoleName.IND_PROFESSIONAL_INTERPRETER) {
      return this.stepInfoService.getIndPersonalInterpreterSteps(userRole);
    }

    if (userRoleName === EUserRoleName.IND_CLIENT) {
      return this.stepInfoService.getIndClientSteps(userRole);
    }

    if (userRoleName === EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_IND_INTERPRETER) {
      return this.stepInfoService.getCorporateInterpreterSteps(userRole);
    }

    return this.stepInfoService.getOtherRolesSteps(userRole);
  }

  private async notifyUserAboutActivation(userRole: TProcessAccountActivation): Promise<void> {
    const loginLink = `${this.FRONT_END_URL}/login`;

    this.emailsService
      .sendIndividualAccountActivatedEmail(
        userRole.user.email,
        userRole.profile.preferredName || userRole.profile.firstName,
        loginLink,
      )
      .catch((error: Error) => {
        this.lokiLogger.error(`Failed to send account activation email for userRoleId: ${userRole.id}`, error.stack);
      });
    this.notificationService.sendAccountActivationNotification(userRole.id).catch((error: Error) => {
      this.lokiLogger.error(
        `Failed to send account activation notification for userRoleId: ${userRole.id}`,
        error.stack,
      );
    });
  }

  private async notifyUserAboutDeactivation(userRole: TDeactivate): Promise<void> {
    this.emailsService
      .sendIndividualAccountDeactivatedEmail(
        userRole.user.email,
        userRole.profile.preferredName || userRole.profile.firstName,
      )
      .catch((error: Error) => {
        this.lokiLogger.error(`Failed to send account deactivation email for userRoleId: ${userRole.id}`, error.stack);
      });
    this.notificationService.sendAccountDeactivationNotification(userRole.id).catch((error: Error) => {
      this.lokiLogger.error(
        `Failed to send account deactivation notification for userRoleId: ${userRole.id}`,
        error.stack,
      );
    });
  }
}
