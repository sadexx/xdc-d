import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LokiLogger } from "src/common/logger";
import {
  RESTORATION_TOKEN_QUERY_PARAM,
  RESTORATION_KEY_QUERY_PARAM,
  RESTORATION_TYPE,
} from "src/modules/auth/common/constants";
import { Company } from "src/modules/companies/entities";
import { EmailsService } from "src/modules/emails/services";
import { EUserRoleName } from "src/modules/users/common/enums";
import { UserRole } from "src/modules/users/entities";
import { ERestorationType } from "src/modules/removal/common/enums";
import { IRestorationConfig } from "src/modules/removal/common/interfaces";
import { TSendUserRemovalRequestEmail } from "src/modules/removal/common/types";
import { TokensService } from "src/modules/tokens/services";

@Injectable()
export class RemovalNotificationService {
  private readonly lokiLogger = new LokiLogger(RemovalNotificationService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly emailsService: EmailsService,
    private readonly tokensService: TokensService,
  ) {}

  public async sendUserRemovalRequestEmail(
    emailToSendRestorationLink: string,
    targetUserRole: TSendUserRemovalRequestEmail,
    restorationConfig: IRestorationConfig,
    isSelfDeleting: boolean,
    role?: EUserRoleName,
  ): Promise<void> {
    const completeRestorationLink = await this.createRestorationLink(
      emailToSendRestorationLink,
      targetUserRole.user.id,
      restorationConfig.restorationKey,
      ERestorationType.USER,
    );

    if (isSelfDeleting) {
      await this.sendSelfRemovalRequestEmail(
        emailToSendRestorationLink,
        targetUserRole,
        completeRestorationLink,
        restorationConfig.linkDurationString,
        role,
      );
    } else {
      await this.sendAdminRemovalRequestEmail(
        emailToSendRestorationLink,
        targetUserRole,
        completeRestorationLink,
        restorationConfig.linkDurationString,
        role,
      );
    }
  }

  private async sendSelfRemovalRequestEmail(
    emailToSendRestorationLink: string,
    targetUserRole: TSendUserRemovalRequestEmail,
    completeRestorationLink: string,
    linkDurationString: string,
    role?: EUserRoleName,
  ): Promise<void> {
    const userName = `${targetUserRole.profile.preferredName || targetUserRole.profile.firstName} ${targetUserRole.profile.lastName}`;
    this.emailsService
      .sendUserSelfRestorationLink(
        emailToSendRestorationLink,
        completeRestorationLink,
        linkDurationString,
        userName,
        role,
      )
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send user self restoration email for userRole: ${targetUserRole.id}`,
          error.stack,
        );
      });
  }

  private async sendAdminRemovalRequestEmail(
    emailToSendRestorationLink: string,
    targetUserRole: TSendUserRemovalRequestEmail,
    completeRestorationLink: string,
    linkDurationString: string,
    role?: EUserRoleName,
  ): Promise<void> {
    this.emailsService
      .sendUserRestorationLink(
        emailToSendRestorationLink,
        completeRestorationLink,
        linkDurationString,
        targetUserRole.user.platformId || "",
        targetUserRole.operatedByCompanyName,
        role,
      )
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send user restoration email for admin: ${emailToSendRestorationLink}`,
          error.stack,
        );
      });
    this.emailsService
      .sendUserAccountRemovalNotification(targetUserRole.profile.contactEmail, linkDurationString, role)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send user account deletion notification email for userRole: ${targetUserRole.id}`,
          error.stack,
        );
      });
  }

  public async sendCompanyRemovalRequestEmail(
    emailToSendRestorationLink: string,
    targetUserRole: UserRole,
    restorationConfig: IRestorationConfig,
    company: Company,
  ): Promise<void> {
    const completeRestorationLink = await this.createRestorationLink(
      emailToSendRestorationLink,
      targetUserRole.user.id,
      restorationConfig.restorationKey,
      ERestorationType.COMPANY,
    );

    this.emailsService
      .sendCompanyRestorationLink(
        emailToSendRestorationLink,
        completeRestorationLink,
        restorationConfig.linkDurationString,
        company.adminName!,
      )
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send user account deletion notification email for userRole: ${targetUserRole.id}`,
          error.stack,
        );
      });
  }

  private async createRestorationLink(
    email: string,
    userId: string,
    restorationKey: string,
    restorationType: ERestorationType,
  ): Promise<string> {
    const restorationToken = await this.tokensService.createRestorationToken({
      email,
      userId,
      isInvitation: false,
    });
    const completeRestorationLink = `${this.configService.getOrThrow<string>("frontend.restorationRedirectionLink")}?${RESTORATION_TOKEN_QUERY_PARAM}=${restorationToken}&${RESTORATION_KEY_QUERY_PARAM}=${restorationKey}&${RESTORATION_TYPE}=${restorationType}`;

    return completeRestorationLink;
  }
}
