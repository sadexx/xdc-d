import { Injectable } from "@nestjs/common";
import { NotificationService } from "src/modules/notifications/services";
import { LokiLogger } from "src/common/logger";
import { EPaymentFailedReason } from "src/modules/payments/common/enums/core";
import { EmailsService } from "src/modules/emails/services";
import { MINIMUM_DEPOSIT_CHARGE_AMOUNT } from "src/modules/companies-deposit-charge/common/constants";
import { format } from "date-fns";
import {
  TSendAuthorizationPaymentNotification,
  TSendDepositLowBalanceNotificationCompany,
  TSendDepositLowBalanceNotificationSuperAdmin,
} from "src/modules/payments/common/types/management";

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
    const { profile } = superAdminRole;
    this.emailsService
      .sendDepositLowBalanceNotification(company.contactEmail, {
        adminName: profile.preferredName || profile.firstName,
        platformId: company.platformId,
        minimumRequiredBalance: MINIMUM_DEPOSIT_CHARGE_AMOUNT,
        currentBalance,
      })
      .catch((error: Error) => {
        this.lokiLogger.error(`Failed to send payment success email for email: ${company.contactEmail}`, error.stack);
      });
  }

  public async sendDepositBalanceInsufficientFundNotification(
    company: TSendDepositLowBalanceNotificationCompany,
    superAdminRole: TSendDepositLowBalanceNotificationSuperAdmin,
  ): Promise<void> {
    const { profile } = superAdminRole;
    this.emailsService
      .sendDepositBalanceInsufficientFundNotification(company.contactEmail, {
        adminName: profile.preferredName || profile.firstName,
        platformId: company.platformId,
        date: format(new Date(), "dd/MM/yyyy"),
      })
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send deposit balance insufficient notification for userRoleId: ${superAdminRole.id}`,
          error.stack,
        );
      });
  }
}
