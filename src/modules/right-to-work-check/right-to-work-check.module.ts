import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserDocument, UserRole } from "src/modules/users/entities";
import { FileManagementModule } from "src/modules/file-management/file-management.module";
import { AwsS3Module } from "src/modules/aws/s3/aws-s3.module";
import { ActivationTrackingModule } from "src/modules/activation-tracking/activation-tracking.module";
import { EmailsModule } from "src/modules/emails/emails.module";
import { RightToWorkCheck } from "src/modules/right-to-work-check/entities";
import { RightToWorkCheckService } from "src/modules/right-to-work-check/services";
import { RightToWorkCheckController } from "src/modules/right-to-work-check/controllers";
import { InterpreterProfileModule } from "src/modules/interpreters/profile/interpreter-profile.module";
import { NotificationModule } from "src/modules/notifications/notification.module";
import { HelperModule } from "src/modules/helper/helper.module";
import { AccessControlModule } from "src/modules/access-control/access-control.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([UserDocument, RightToWorkCheck, UserRole]),
    ActivationTrackingModule,
    AwsS3Module,
    FileManagementModule,
    EmailsModule,
    InterpreterProfileModule,
    NotificationModule,
    HelperModule,
    AccessControlModule,
  ],
  providers: [RightToWorkCheckService],
  controllers: [RightToWorkCheckController],
})
export class RightToWorkCheckModule {}
