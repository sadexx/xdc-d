import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EmailsModule } from "src/modules/emails/emails.module";
import {
  UserProfilesService,
  UserProfileUpdatePolicyService,
  UsersPasswordService,
  UsersQueryOptionsService,
  UsersRegistrationService,
  UsersRegistrationStepsService,
  UsersService,
} from "src/modules/users/services";
import { Role, User, UserDocument, UserProfile } from "src/modules/users/entities";
import { AwsPinpointModule } from "src/modules/aws/pinpoint/aws-pinpoint.module";
import { AddressAndDeviceAuthenticationMiddleware } from "src/modules/auth/common/middlewares";
import { UserProfilesController, UsersController, UsersPasswordController } from "src/modules/users/controllers";
import { ActivationTrackingModule } from "src/modules/activation-tracking/activation-tracking.module";
import { Company } from "src/modules/companies/entities";
import { UserRole } from "src/modules/users/entities";
import { FileManagementModule } from "src/modules/file-management/file-management.module";
import { UserAvatarsModule } from "src/modules/user-avatars/user-avatars.module";
import { InterpreterBadgeModule } from "src/modules/interpreters/badge/interpreter-badge.module";
import { Address } from "src/modules/addresses/entities";
import { MockModule } from "src/modules/mock/mock.module";
import { AccessControlModule } from "src/modules/access-control/access-control.module";
import { ChimeMessagingConfigurationModule } from "src/modules/chime-messaging-configuration/chime-messaging-configuration.module";
import { DataTransferModule } from "src/modules/data-transfer/data-transfer.module";
import { TokensModule } from "src/modules/tokens/tokens.module";
import { DiscountsModule } from "src/modules/discounts/discounts.module";
import { RedisModule } from "src/modules/redis/redis.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserDocument, UserProfile, Company, UserRole, Address, Role]),
    AwsPinpointModule,
    EmailsModule,
    ActivationTrackingModule,
    FileManagementModule,
    UserAvatarsModule,
    InterpreterBadgeModule,
    MockModule,
    AccessControlModule,
    ChimeMessagingConfigurationModule,
    DataTransferModule,
    TokensModule,
    DiscountsModule,
    RedisModule,
  ],
  providers: [
    UsersService,
    UserProfilesService,
    UserProfileUpdatePolicyService,
    UsersQueryOptionsService,
    UsersRegistrationService,
    UsersRegistrationStepsService,
    UsersPasswordService,
  ],
  controllers: [UsersController, UserProfilesController, UsersPasswordController],
  exports: [UsersService, UserProfilesService, UsersRegistrationService, UsersRegistrationStepsService],
})
export class UsersModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AddressAndDeviceAuthenticationMiddleware).forRoutes(UsersPasswordController);
  }
}
