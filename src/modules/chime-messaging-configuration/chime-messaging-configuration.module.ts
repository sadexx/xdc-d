import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppInstanceConfig, Channel, ChannelMembership } from "src/modules/chime-messaging-configuration/entities";
import {
  MessagingCreationService,
  MessagingIdentityService,
  MessagingManagementService,
  MessagingQueryOptionsService,
  MessagingQueryService,
  MessagingResolveService,
} from "src/modules/chime-messaging-configuration/services";
import { AwsMessagingSdkModule } from "src/modules/aws/messaging-sdk/aws-messaging-sdk.module";
import { ChimeMessagingConfigurationController } from "src/modules/chime-messaging-configuration/controllers";
import { FileManagementModule } from "src/modules/file-management/file-management.module";
import { AwsS3Module } from "src/modules/aws/s3/aws-s3.module";
import { ActiveChannelStorageService } from "src/modules/web-socket-gateway/common/storages";
import { UserRole } from "src/modules/users/entities";
import { AccessControlModule } from "src/modules/access-control/access-control.module";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { RedisModule } from "src/modules/redis/redis.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Channel, ChannelMembership, AppInstanceConfig, UserRole, Appointment]),
    AwsMessagingSdkModule,
    FileManagementModule,
    AwsS3Module,
    AccessControlModule,
    RedisModule,
  ],
  controllers: [ChimeMessagingConfigurationController],
  providers: [
    MessagingIdentityService,
    MessagingManagementService,
    MessagingCreationService,
    MessagingQueryOptionsService,
    MessagingQueryService,
    MessagingResolveService,
    ActiveChannelStorageService,
  ],
  exports: [
    MessagingIdentityService,
    MessagingManagementService,
    MessagingCreationService,
    MessagingQueryService,
    MessagingResolveService,
  ],
})
export class ChimeMessagingConfigurationModule {}
