import { Module } from "@nestjs/common";
import { AccountActivationController, CompanyActivationController } from "src/modules/account-activation/controllers";
import {
  AccountActivationQueryOptionsService,
  AccountActivationService,
  CompanyActivationService,
  StepInfoService,
} from "src/modules/account-activation/services";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "src/modules/users/entities";
import { SessionsModule } from "src/modules/sessions/sessions.module";
import { Company } from "src/modules/companies/entities";
import { UserRole } from "src/modules/users/entities";
import { NotificationModule } from "src/modules/notifications/notification.module";
import { HelperModule } from "src/modules/helper/helper.module";
import { EmailsModule } from "src/modules/emails/emails.module";
import { AccessControlModule } from "src/modules/access-control/access-control.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Company, UserRole]),
    AccessControlModule,
    SessionsModule,
    NotificationModule,
    HelperModule,
    EmailsModule,
  ],
  controllers: [AccountActivationController, CompanyActivationController],
  providers: [
    AccountActivationService,
    StepInfoService,
    CompanyActivationService,
    AccountActivationQueryOptionsService,
  ],
  exports: [AccountActivationService, CompanyActivationService],
})
export class AccountActivationModule {}
