import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserDocument, UserRole } from "src/modules/users/entities";
import { FileManagementModule } from "src/modules/file-management/file-management.module";
import { AwsS3Module } from "src/modules/aws/s3/aws-s3.module";
import { ActivationTrackingModule } from "src/modules/activation-tracking/activation-tracking.module";
import { LanguageDocCheckController } from "src/modules/language-doc-check/controllers";
import { EmailsModule } from "src/modules/emails/emails.module";
import { InterpreterProfileModule } from "src/modules/interpreters/profile/interpreter-profile.module";
import { InterpreterProfile } from "src/modules/interpreters/profile/entities";
import { NotificationModule } from "src/modules/notifications/notification.module";
import { InterpreterBadgeModule } from "src/modules/interpreters/badge/interpreter-badge.module";
import { LanguageDocCheckService } from "src/modules/language-doc-check/services/";
import { LanguageDocCheck } from "src/modules/language-doc-check/entities";
import { HelperModule } from "src/modules/helper/helper.module";
import { AccessControlModule } from "src/modules/access-control/access-control.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([UserDocument, LanguageDocCheck, InterpreterProfile, UserRole]),
    ActivationTrackingModule,
    AwsS3Module,
    FileManagementModule,
    EmailsModule,
    InterpreterProfileModule,
    NotificationModule,
    InterpreterBadgeModule,
    HelperModule,
    AccessControlModule,
  ],
  providers: [LanguageDocCheckService],
  controllers: [LanguageDocCheckController],
})
export class LanguageDocCheckModule {}
