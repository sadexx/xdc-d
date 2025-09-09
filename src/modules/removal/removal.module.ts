import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  RemovalNotificationService,
  RemovalQueryOptionsService,
  RemovalRequestService,
  RemovalRestorationService,
  RemovalSchedulerService,
  RemovalService,
  RemovalSharedService,
} from "src/modules/removal/services";
import { Company } from "src/modules/companies/entities";
import { User } from "src/modules/users/entities";
import { UserRole } from "src/modules/users/entities";
import { InterpreterBadgeModule } from "src/modules/interpreters/badge/interpreter-badge.module";
import { HelperModule } from "src/modules/helper/helper.module";
import { RemovalController } from "src/modules/removal/controllers";
import { EmailsModule } from "src/modules/emails/emails.module";
import { UserAvatarsModule } from "src/modules/user-avatars/user-avatars.module";
import { AwsS3Module } from "src/modules/aws/s3/aws-s3.module";
import { AccessControlModule } from "src/modules/access-control/access-control.module";
import { TokensModule } from "src/modules/tokens/tokens.module";
import { Appointment } from "src/modules/appointments/appointment/entities";

@Module({
  imports: [
    TypeOrmModule.forFeature([Company, User, UserRole, Appointment]),
    InterpreterBadgeModule,
    HelperModule,
    EmailsModule,
    UserAvatarsModule,
    AwsS3Module,
    AccessControlModule,
    TokensModule,
  ],
  controllers: [RemovalController],
  providers: [
    RemovalService,
    RemovalRequestService,
    RemovalSchedulerService,
    RemovalRestorationService,
    RemovalNotificationService,
    RemovalQueryOptionsService,
    RemovalSharedService,
  ],
  exports: [RemovalSchedulerService, RemovalService],
})
export class RemovalModule {}
