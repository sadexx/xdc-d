import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Company } from "src/modules/companies/entities";
import { OldPayment, OldPaymentItem } from "src/modules/payments/entities";
import { StripeModule } from "src/modules/stripe/stripe.module";
import { NotificationModule } from "src/modules/notifications/notification.module";
import {
  CompaniesDepositChargeExecutionService,
  CompaniesDepositChargeManagementService,
  CompaniesDepositChargeNotificationService,
} from "src/modules/companies-deposit-charge/services";
import { CompanyDepositCharge } from "src/modules/companies-deposit-charge/entities";
import { EmailsModule } from "src/modules/emails/emails.module";
import { HelperModule } from "src/modules/helper/helper.module";
import { CompaniesDepositChargeController } from "src/modules/companies-deposit-charge/controllers";
import { AccessControlModule } from "src/modules/access-control/access-control.module";
import { PaymentsModule } from "src/modules/payments-new/payments.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([OldPayment, OldPaymentItem, Company, CompanyDepositCharge]),
    forwardRef(() => PaymentsModule),
    StripeModule,
    NotificationModule,
    EmailsModule,
    HelperModule,
    AccessControlModule,
  ],
  providers: [
    CompaniesDepositChargeManagementService,
    CompaniesDepositChargeExecutionService,
    CompaniesDepositChargeNotificationService,
  ],
  controllers: [CompaniesDepositChargeController],
  exports: [CompaniesDepositChargeManagementService, CompaniesDepositChargeExecutionService],
})
export class CompaniesDepositChargeModule {}
