import { Injectable } from "@nestjs/common";
import { NotificationService } from "src/modules/notifications/services";
import {
  TSendAuthorizationPaymentNotification,
  TSendDepositLowBalanceNotificationCompany,
  TSendDepositLowBalanceNotificationSuperAdmin,
} from "src/modules/payments-new/common/types";
import { LokiLogger } from "src/common/logger";
import { EPaymentFailedReason } from "src/modules/payments-new/common/enums";
import { EmailsService } from "src/modules/emails/services";
import { MINIMUM_DEPOSIT_CHARGE_AMOUNT } from "src/modules/companies-deposit-charge/common/constants";

@Injectable()
export class PaymentsNotificationService {
  private readonly lokiLogger = new LokiLogger(PaymentsNotificationService.name);
  constructor(
    private readonly notificationService: NotificationService,
    private readonly emailsService: EmailsService,
  ) {}

  public async sendAuthorizationPaymentSuccessNotification(
    appointment: TSendAuthorizationPaymentNotification,
  ): Promise<void> {
    this.notificationService
      .sendAppointmentAuthorizationPaymentSucceededNotification(appointment.client.id, appointment.platformId, {
        appointmentId: appointment.id,
      })
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send payment success notification for userRoleId: ${appointment?.client?.id}`,
          error.stack,
        );
      });
  }

  public async sendAuthorizationPaymentFailedNotification(
    appointment: TSendAuthorizationPaymentNotification,
    failedReason: EPaymentFailedReason,
  ): Promise<void> {
    this.notificationService
      .sendAppointmentAuthorizationPaymentFailedNotification(
        appointment.client.id,
        appointment.platformId,
        failedReason,
        { appointmentId: appointment.id },
      )
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send payment failed notification for userRoleId: ${appointment?.client?.id}`,
          error.stack,
        );
      });
  }

  public async sendDepositLowBalanceNotification(
    company: TSendDepositLowBalanceNotificationCompany,
    superAdminRole: TSendDepositLowBalanceNotificationSuperAdmin,
    currentBalance: number,
  ): Promise<void> {
    this.emailsService
      .sendDepositLowBalanceNotification(company.contactEmail, {
        adminName: superAdminRole.profile.preferredName || superAdminRole.profile.firstName || "",
        platformId: company.platformId,
        minimumRequiredBalance: MINIMUM_DEPOSIT_CHARGE_AMOUNT,
        currentBalance,
      })
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send payment success notification for userRoleId: ${superAdminRole.id}`,
          error.stack,
        );
      });
  }
}
