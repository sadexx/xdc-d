import { Injectable } from "@nestjs/common";
import { NotificationService } from "src/modules/notifications/services";
import { UserRole } from "src/modules/users/entities";
import { LokiLogger } from "src/common/logger";
import { EmailsService } from "src/modules/emails/services";
import { ConfigService } from "@nestjs/config";
import { IAppointmentDetailsOutput } from "src/modules/appointments/appointment/common/outputs";
import {
  IAppointmentOrderInvitationOutput,
  IOnDemandInvitationOutput,
  ISearchConditionsOutput,
} from "src/modules/search-engine-logic/common/outputs";

@Injectable()
export class SearchEngineNotificationService {
  private readonly lokiLogger = new LokiLogger(SearchEngineNotificationService.name);
  private readonly FRONT_END_URL: string;

  constructor(
    private readonly notificationService: NotificationService,
    private readonly emailsService: EmailsService,
    private readonly configService: ConfigService,
  ) {
    this.FRONT_END_URL = this.configService.getOrThrow<string>("frontend.uri");
  }

  public async sendSearchClientNotificationCaseTopic(
    clientId: string,
    platformId: string,
    searchConditions: ISearchConditionsOutput,
  ): Promise<void> {
    this.notificationService
      .sendNoExpertiseMatchNotification(clientId, platformId, searchConditions)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send search notification case: topic, for order for userRoleId: ${clientId}`,
          error.stack,
        );
      });
  }

  public async sendSearchClientNotificationCaseGenderAndTopic(
    clientId: string,
    platformId: string,
    searchConditions: ISearchConditionsOutput,
  ): Promise<void> {
    this.notificationService
      .sendExperienceGenderMismatchNotification(clientId, platformId, searchConditions)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send search notification case: gender and topic, for order for userRoleId: ${clientId}`,
          error.stack,
        );
      });
  }

  public async sendSearchClientNotificationCaseGender(
    clientId: string,
    platformId: string,
    searchConditions: ISearchConditionsOutput,
  ): Promise<void> {
    this.notificationService
      .sendGenderMismatchNotification(clientId, platformId, searchConditions)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send search notification case: gender, for order for userRoleId: ${clientId}`,
          error.stack,
        );
      });
  }

  public async sendNotificationToAdmins(
    lfhAdmins: UserRole[],
    platformId: string,
    appointmentDetails: IAppointmentDetailsOutput,
  ): Promise<void> {
    const appointmentDetailsLink = `${this.FRONT_END_URL}/appointments/current?pushData={"type":"appointment-details","appointmentId":"${appointmentDetails.appointmentId}"}`;

    for (const admin of lfhAdmins) {
      await this.emailsService.sendRedFlagEnabledEmail(admin.user.email, platformId, appointmentDetailsLink);
      this.notificationService
        .sendRedFlagForAppointmentNotification(admin.id, platformId, appointmentDetails)
        .catch((error: Error) => {
          this.lokiLogger.error(
            `Error in sendRedFlagForAppointmentNotification for order with platformId: ${platformId} `,
            error.stack,
          );
        });
    }
  }

  public async sendOnDemandNotification(
    interpreterId: string,
    platformId: string,
    onDemandInvitation: IOnDemandInvitationOutput,
  ): Promise<void> {
    this.notificationService
      .sendNewOnDemandInvitationForAppointmentNotification(interpreterId, platformId, onDemandInvitation)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send on-demand new invitation for appointment notification for userRoleId: ${interpreterId}`,
          error.stack,
        );
      });
  }

  public async sendGroupNotification(
    interpreterId: string,
    groupId: string,
    appointmentOrderInvitation: IAppointmentOrderInvitationOutput,
  ): Promise<void> {
    this.notificationService
      .sendNewInvitationForAppointmentsNotification(interpreterId, groupId, appointmentOrderInvitation)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send new group invitation for appointments notification for userRoleId: ${interpreterId}`,
          error.stack,
        );
      });
  }

  public async sendSingleNotification(
    interpreterId: string,
    platformId: string,
    appointmentOrderInvitation: IAppointmentOrderInvitationOutput,
  ): Promise<void> {
    this.notificationService
      .sendNewInvitationForAppointmentNotification(interpreterId, platformId, appointmentOrderInvitation)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send single new invitation for appointment notification for userRoleId: ${interpreterId}`,
          error.stack,
        );
      });
  }
}
