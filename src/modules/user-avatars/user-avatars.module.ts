import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserAvatarsController } from "src/modules/user-avatars/controllers";
import { UserAvatarsService } from "src/modules/user-avatars/services";
import { UserAvatarRequest } from "src/modules/user-avatars/entities";
import { User, UserRole } from "src/modules/users/entities";
import { AwsS3Module } from "src/modules/aws/s3/aws-s3.module";
import { NotificationModule } from "src/modules/notifications/notification.module";
import { FileManagementModule } from "src/modules/file-management/file-management.module";
import { SessionsModule } from "src/modules/sessions/sessions.module";
import { InterpreterBadgeModule } from "src/modules/interpreters/badge/interpreter-badge.module";
import { EmailsModule } from "src/modules/emails/emails.module";
import { HelperModule } from "src/modules/helper/helper.module";
import { RedisModule } from "src/modules/redis/redis.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([UserAvatarRequest, User, UserRole]),
    AwsS3Module,
    NotificationModule,
    FileManagementModule,
    SessionsModule,
    InterpreterBadgeModule,
    EmailsModule,
    HelperModule,
    RedisModule,
  ],
  controllers: [UserAvatarsController],
  providers: [UserAvatarsService],
  exports: [UserAvatarsService],
})
export class UserAvatarsModule {}
