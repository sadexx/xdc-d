import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { LokiLogger } from "src/common/logger";
import { NotificationService } from "src/modules/notifications/services";
import { UserRole } from "src/modules/users/entities";
import { EmailsService } from "src/modules/emails/services";
import { CLIENT_ROLES } from "src/common/constants";
import { IAppointmentDetailsOutput } from "src/modules/appointments/appointment/common/outputs";
import { IAppointmentOrderInvitationOutput } from "src/modules/search-engine-logic/common/outputs";
import { findOneOrFailTyped, isInRoles } from "src/common/utils";

@Injectable()
export class AppointmentOrderNotificationService {
  private readonly lokiLogger = new LokiLogger(AppointmentOrderNotificationService.name);
  private readonly FRONT_END_URL: string;

  constructor(
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly notificationService: NotificationService,
    private readonly emailsService: EmailsService,
    private readonly configService: ConfigService,
  ) {
    this.FRONT_END_URL = this.configService.getOrThrow<string>("frontend.uri");
  }

  public async sendAcceptedOrderNotification(
    clientId: string,
    platformId: string,
    appointmentDetails: IAppointmentDetailsOutput,
  ): Promise<void> {
    this.notificationService
      .sendAcceptedAppointmentNotification(clientId, platformId, appointmentDetails)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send accepted appointment notification for userRoleId: ${clientId}`,
          error.stack,
        );
      });
  }

  public async sendAcceptedGroupNotification(
    clientId: string,
    platformId: string,
    appointmentDetails: IAppointmentDetailsOutput,
  ): Promise<void> {
    this.notificationService
      .sendAcceptedGroupAppointmentNotification(clientId, platformId, appointmentDetails)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send accepted group appointment notification for userRoleId: ${clientId}`,
          error.stack,
        );
      });
  }

  public async sendRepeatSingleNotification(
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

  public async sendRepeatGroupNotification(
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

  public async sendCanceledNotification(
    userRole: UserRole,
    platformId: string,
    isGroup: boolean,
    appointmentDetails: IAppointmentDetailsOutput,
  ): Promise<void> {
    const sendNotificationPromise = isGroup
      ? this.notificationService.sendAdminCanceledAppointmentsNotification(userRole.id, platformId, appointmentDetails)
      : this.notificationService.sendAdminCanceledAppointmentNotification(userRole.id, platformId, appointmentDetails);

    sendNotificationPromise.catch((error: Error) => {
      this.lokiLogger.error(
        `Failed to send canceled appointment notification for userRoleId: ${userRole.id}`,
        error.stack,
      );
    });

    if (isInRoles(CLIENT_ROLES, userRole.role.name)) {
      this.emailsService
        .sendAppointmentCancellationNoticeBySystemEmail(
          userRole.user.email,
          platformId,
          userRole.profile.preferredName || userRole.profile.firstName,
          isGroup,
        )
        .catch((error: Error) => {
          this.lokiLogger.error(
            `Failed to send canceled appointment email for userRoleId: ${userRole.id}`,
            error.stack,
          );
        });
    }
  }

  public async sendNotificationToMatchedInterpretersForOrder(
    platformId: string,
    matchedInterpreterIds: string[],
    appointmentOrderInvitation: IAppointmentOrderInvitationOutput,
  ): Promise<void> {
    const appointmentDetailsLink = `${this.FRONT_END_URL}/appointments/current?pushData={"type":"appointment-details","appointmentId":"${appointmentOrderInvitation.appointmentId}"}`;
    for (const interpreterId of matchedInterpreterIds) {
      const userRole = await findOneOrFailTyped<UserRole>(interpreterId, this.userRoleRepository, {
        where: { id: interpreterId },
        relations: { user: true },
      });

      this.emailsService
        .sendRepeatedAppointmentInvitationEmail(userRole.user.email, platformId, appointmentDetailsLink, false)
        .catch((error: Error) => {
          this.lokiLogger.error(
            `Error in sendRepeatedAppointmentInvitationEmail with order platformId: ${platformId}`,
            error.stack,
          );
        });
      this.notificationService
        .sendRepeatInvitationForAppointmentNotification(interpreterId, platformId, appointmentOrderInvitation)
        .catch((error: Error) => {
          this.lokiLogger.error(
            `Error in sendNotificationToMatchedInterpretersForOrder with order platformId: ${platformId}`,
            error.stack,
          );
        });
    }
  }

  public async sendNotificationToMatchedInterpretersForGroup(
    platformId: string,
    matchedInterpreterIds: string[],
    appointmentOrderInvitation: IAppointmentOrderInvitationOutput,
  ): Promise<void> {
    const appointmentDetailsLink = `${this.FRONT_END_URL}/appointments/current?pushData={"type":"appointment-details","appointmentsGroupId":"${appointmentOrderInvitation.appointmentsGroupId}"}`;
    for (const interpreterId of matchedInterpreterIds) {
      const userRole = await findOneOrFailTyped<UserRole>(interpreterId, this.userRoleRepository, {
        where: { id: interpreterId },
        relations: { user: true },
      });

      this.emailsService
        .sendRepeatedAppointmentInvitationEmail(userRole.user.email, platformId, appointmentDetailsLink, true)
        .catch((error: Error) => {
          this.lokiLogger.error(
            `Error in sendRepeatedAppointmentInvitationEmail with order platformId: ${platformId}`,
            error.stack,
          );
        });
      this.notificationService
        .sendRepeatInvitationForAppointmentsNotification(interpreterId, platformId, appointmentOrderInvitation)
        .catch((error: Error) => {
          this.lokiLogger.error(
            `Error in sendRepeatInvitationForAppointmentsNotification with group platformId: ${platformId}`,
            error.stack,
          );
        });
    }
  }

  public async sendNotificationToAdmins(
    lfhAdmins: UserRole[],
    platformId: string,
    isOrderGroup: boolean,
    appointmentDetails: IAppointmentDetailsOutput,
  ): Promise<void> {
    if (!isOrderGroup) {
      const appointmentDetailsLink = `${this.FRONT_END_URL}/appointments/current?pushData={"type":"appointment-details","appointmentId":"${appointmentDetails.appointmentId}"}`;
      for (const admin of lfhAdmins) {
        this.emailsService
          .sendRedFlagEnabledEmail(admin.user.email, platformId, appointmentDetailsLink)
          .catch((error: Error) => {
            this.lokiLogger.error(
              `Error in sendRedFlagEnabledEmail for order with platformId: ${platformId} `,
              error.stack,
            );
          });
        this.notificationService
          .sendRedFlagForAppointmentNotification(admin.id, platformId, appointmentDetails)
          .catch((error: Error) => {
            this.lokiLogger.error(
              `Error in sendRedFlagForAppointmentNotification for order with platformId: ${platformId} `,
              error.stack,
            );
          });
      }
    } else {
      const appointmentDetailsLink = `${this.FRONT_END_URL}/appointments/current?pushData={"type":"appointment-details","appointmentsGroupId":"${appointmentDetails.appointmentsGroupId}"}`;
      for (const admin of lfhAdmins) {
        this.emailsService
          .sendRedFlagEnabledEmail(admin.user.email, platformId, appointmentDetailsLink, isOrderGroup)
          .catch((error: Error) => {
            this.lokiLogger.error(
              `Error in sendRedFlagEnabledEmail for order group with platformId: ${platformId} `,
              error.stack,
            );
          });
        this.notificationService
          .sendRedFlagForAppointmentsNotification(admin.id, platformId, appointmentDetails)
          .catch((error: Error) => {
            this.lokiLogger.error(
              `Error in sendRedFlagForAppointmentsNotification for order group with platformId: ${platformId} `,
              error.stack,
            );
          });
      }
    }
  }
}
