import { Injectable } from "@nestjs/common";
import { LokiLogger } from "src/common/logger";
import { EPaymentFailedReason } from "src/modules/payments/common/enums/core";
import { TChargeCompaniesDeposit } from "src/modules/companies-deposit-charge/common/types";
import { EUserRoleName } from "src/modules/users/common/enums";
import { EmailsService } from "src/modules/emails/services";
import { NotificationService } from "src/modules/notifications/services";
import { IHandleDepositChargeFailureData } from "src/modules/companies-deposit-charge/common/interfaces";

@Injectable()
export class CompaniesDepositChargeNotificationService {
  private readonly lokiLogger = new LokiLogger(CompaniesDepositChargeNotificationService.name);
  constructor(
    private readonly notificationService: NotificationService,
    private readonly emailsService: EmailsService,
  ) {}

  public async sendEarlyFailureNotification(
    company: TChargeCompaniesDeposit["company"],
    reason: EPaymentFailedReason,
  ): Promise<void> {
    if (!company.superAdmin) {
      return;
    }

    const superAdminRole = company.superAdmin.userRoles.find(
      (userRole) =>
        userRole.role.name === EUserRoleName.CORPORATE_CLIENTS_SUPER_ADMIN ||
        userRole.role.name === EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_SUPER_ADMIN,
    );

    if (!superAdminRole) {
      return;
    }

    this.notificationService
      .sendDepositChargeFailedNotification(superAdminRole.id, company.platformId, reason, { companyId: company.id })
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send deposit charge failed notification for userRoleId: ${superAdminRole.id}`,
          error.stack,
        );
      });
  }

  public async sendDepositChargeFailedNotification(data: IHandleDepositChargeFailureData): Promise<void> {
    const { company, calculatedAmounts, currency, payment, superAdminRole } = data;

    this.emailsService
      .sendDepositChargeFailedNotification(company.contactEmail, {
        adminName: superAdminRole.profile.preferredName ?? superAdminRole.profile.firstName,
        amount: calculatedAmounts.totalAmount,
        currency: currency,
        platformId: company.platformId,
        receiptNumber: payment.platformId ?? "",
      })
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send deposit charge failed notification for email: ${company.contactEmail}`,
          error.stack,
        );
      });
    this.notificationService
      .sendDepositChargeFailedNotification(
        superAdminRole.id,
        company.platformId,
        EPaymentFailedReason.DEPOSIT_CHARGE_FAILED,
        { companyId: company.id },
      )
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send deposit charge failed notification for userRoleId: ${superAdminRole.id}`,
          error.stack,
        );
      });
  }
}
