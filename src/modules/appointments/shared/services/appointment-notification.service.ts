import { Injectable } from "@nestjs/common";
import { LokiLogger } from "src/common/logger";
import { NotificationService } from "src/modules/notifications/services";
import { CLIENT_ROLES } from "src/common/constants";
import { EmailsService } from "src/modules/emails/services";
import { UserRole } from "src/modules/users/entities";
import { EAppointmentRecreationType } from "src/modules/appointments/appointment/common/enums";
import { User } from "src/modules/users/entities";
import {
  IAppointmentDetailsOutput,
  IAppointmentParticipantInvitationOutput,
} from "src/modules/appointments/appointment/common/outputs";
import { TCancelAppointment, TUpdateAppointment } from "src/modules/appointments/appointment/common/types";
import { AwsPinpointService } from "src/modules/aws/pinpoint/services";
import { MultiWayParticipant } from "src/modules/multi-way-participant/entities";
import { isInRoles } from "src/common/utils";
import { TSendClientCanceledAppointmentNotification } from "src/modules/appointments/shared/common/types";

@Injectable()
export class AppointmentNotificationService {
  private readonly lokiLogger = new LokiLogger(AppointmentNotificationService.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly emailsService: EmailsService,
    private readonly awsPinpointService: AwsPinpointService,
  ) {}

  public async sendToClientLateNotification(
    clientId: string,
    lateMinutes: number,
    appointmentDetails: IAppointmentDetailsOutput,
  ): Promise<void> {
    this.notificationService
      .sendClientLateNotification(clientId, lateMinutes, appointmentDetails)
      .catch((error: Error) => {
        this.lokiLogger.error(`Failed to send client late notification for userRoleId: ${clientId}`, error.stack);
      });

    return;
  }

  public async sendToInterpreterLateNotification(
    interpreterId: string,
    platformId: string,
    appointmentDetails: IAppointmentDetailsOutput,
  ): Promise<void> {
    this.notificationService
      .sendInterpreterLateNotification(interpreterId, platformId, appointmentDetails)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send interpreter late notification for userRoleId: ${interpreterId}`,
          error.stack,
        );
      });

    return;
  }

  public async sendUpdatedAppointmentNotificationToInterpreter(
    userRole: UserRole,
    appointment: TUpdateAppointment,
    recreationType: EAppointmentRecreationType | null,
  ): Promise<void> {
    if (recreationType) {
      if (recreationType === EAppointmentRecreationType.GROUP && appointment.appointmentsGroupId) {
        await this.sendClientCanceledAppointmentNotification(
          userRole,
          appointment.appointmentsGroupId,
          false,
          { appointmentsGroupId: appointment.appointmentsGroupId },
          true,
        );
      } else {
        await this.sendClientCanceledAppointmentNotification(
          userRole,
          appointment.platformId,
          false,
          { appointmentId: appointment.id },
          false,
        );
      }
    } else {
      this.notificationService
        .sendClientChangedAppointmentNotification(userRole.id, appointment.platformId, {
          appointmentId: appointment.id,
        })
        .catch((error: Error) => {
          this.lokiLogger.error(
            `Failed to send client changed appointment notification for userRoleId: ${userRole.id}`,
            error.stack,
          );
        });
    }
  }

  public async sendClientCanceledAppointmentNotification(
    userRole: TSendClientCanceledAppointmentNotification,
    platformId: string,
    isCancellationRestrictedByTimeLimits: boolean,
    appointmentDetails: IAppointmentDetailsOutput,
    isGroupCancellation: boolean,
  ): Promise<void> {
    this.notificationService
      .sendClientCanceledAppointmentNotification(userRole.id, platformId, appointmentDetails)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send client canceled appointment notification for userRoleId: ${userRole.id}`,
          error.stack,
        );
      });

    if (isCancellationRestrictedByTimeLimits) {
      this.emailsService
        .sendAppointmentCancellationAfterDeadlineEmail(
          userRole.user.email,
          platformId,
          userRole.profile.preferredName || userRole.profile.firstName,
          userRole.profile.lastName,
          isGroupCancellation,
        )
        .catch((error: Error) => {
          this.lokiLogger.error(
            `Failed to send client canceled appointment after deadline email for userRoleId: ${userRole.id}`,
            error.stack,
          );
        });
    } else {
      this.emailsService
        .sendAppointmentCancellationBeforeDeadlineEmail(
          userRole.user.email,
          platformId,
          userRole.profile.preferredName || userRole.profile.firstName,
          userRole.profile.lastName,
          isGroupCancellation,
        )
        .catch((error: Error) => {
          this.lokiLogger.error(
            `Failed to send client canceled appointment before deadline email for userRoleId: ${userRole.id}`,
            error.stack,
          );
        });
    }
  }

  public async sendAdminCanceledNotification(
    userRole: UserRole,
    groupId: string,
    appointmentDetails: IAppointmentDetailsOutput,
    isGroupCancellation: boolean,
  ): Promise<void> {
    this.notificationService
      .sendAdminCanceledAppointmentsNotification(userRole.id, groupId, appointmentDetails)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send admin canceled group appointments notification for userRoleId: ${userRole.id}`,
          error.stack,
        );
      });

    if (isInRoles(CLIENT_ROLES, userRole.role.name)) {
      this.emailsService
        .sendAppointmentCancellationNoticeByAdminEmail(userRole.user.email, groupId, isGroupCancellation)
        .catch((error: Error) => {
          this.lokiLogger.error(
            `Failed to send admin canceled group appointments email for userRoleId: ${userRole.id}`,
            error.stack,
          );
        });
    }
  }

  public async sendInterpreterCanceledNotification(
    user: User,
    platformId: string,
    interpreterPlatformId: string,
    isGroupCancellation: boolean,
  ): Promise<void> {
    this.emailsService
      .sendAppointmentCancellationNoticeByInterpreterEmail(
        user.email,
        platformId,
        interpreterPlatformId,
        isGroupCancellation,
      )
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send interpreter canceled appointment email for user: ${user.id}`,
          error.stack,
        );
      });
  }

  public async sendAppointmentCancelledToExtraParticipantNotification(
    participant: Pick<MultiWayParticipant, "email" | "phoneCode" | "phoneNumber">,
    appointment: TCancelAppointment,
    isGroupCancellation: boolean,
  ): Promise<void> {
    if (participant.email) {
      this.emailsService
        .sendAppointmentCancellationNoticeToExtraParticipant(participant.email, isGroupCancellation)
        .catch((error: Error) => {
          this.lokiLogger.error(
            `Failed to send appointment cancellation notice email to extra participant for appointment: ${appointment.platformId}`,
            error.stack,
          );
        });

      return;
    }

    if (participant.phoneCode && participant.phoneNumber) {
      this.awsPinpointService
        .sendAppointmentCancellationNoticeToExtraParticipant(
          `${participant.phoneCode}${participant.phoneNumber}`,
          isGroupCancellation,
        )
        .catch((error: Error) => {
          this.lokiLogger.error(
            `Failed to send appointment cancellation notice message to extra participant for appointment: ${appointment.platformId}`,
            error.stack,
          );
        });
    }
  }

  public async sendClientRatingNotification(
    clientId: string,
    platformId: string,
    appointmentDetails: IAppointmentDetailsOutput,
  ): Promise<void> {
    this.notificationService
      .sendClientRatingNotification(clientId, platformId, appointmentDetails)
      .catch((error: Error) => {
        this.lokiLogger.error(`Failed to send client rating notification for userRoleId: ${clientId}`, error.stack);
      });

    return;
  }

  public async sendInterpreterRatingNotification(
    interpreterId: string,
    platformId: string,
    appointmentDetails: IAppointmentDetailsOutput,
  ): Promise<void> {
    this.notificationService
      .sendInterpreterRatingNotification(interpreterId, platformId, appointmentDetails)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send interpreter rating notification for userRoleId: ${interpreterId}`,
          error.stack,
        );
      });

    return;
  }

  public async sendParticipantInvitation(
    invitationData: IAppointmentParticipantInvitationOutput,
    email: string | null,
    phoneNumber: string | null,
  ): Promise<void> {
    if (email) {
      this.emailsService.sendAttendeeInvitationEmail(email, invitationData).catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send appointment participant invitation email for appointment: ${invitationData.platformId}`,
          error.stack,
        );
      });

      return;
    }

    if (phoneNumber) {
      this.awsPinpointService.sendParticipantInvitation(phoneNumber, invitationData).catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send appointment participant invitation message for appointment: ${invitationData.platformId}`,
          error.stack,
        );
      });
    }
  }
}
