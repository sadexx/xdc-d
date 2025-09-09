import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { EmailsModule } from "src/modules/emails/emails.module";
import {
  AppleMobileStrategy,
  AppleWebStrategy,
  GoogleMobileStrategy,
  GoogleWebStrategy,
  JwtActivationAccessStrategy,
  JwtActivationRefreshStrategy,
  JwtEmailConfirmationStrategy,
  JwtFullAccessStrategy,
  JwtFullRefreshStrategy,
  JwtRegistrationStrategy,
  JwtRequiredInfoRefreshStrategy,
  JwtResetPasswordStrategy,
  JwtRoleSelectionStrategy,
} from "src/modules/auth/common/strategies";
import { SessionsModule } from "src/modules/sessions/sessions.module";
import { AddressAndDeviceAuthenticationMiddleware } from "src/modules/auth/common/middlewares";
import {
  AuthQueryOptionsService,
  AuthRegistrationService,
  AuthService,
  AuthThirdPartyService,
  AuthRegistrationLinkService,
  StagingService,
} from "src/modules/auth/services";
import { UsersModule } from "src/modules/users/users.module";
import {
  AuthController,
  AuthRegistrationController,
  AuthThirdPartyController,
  AuthRegistrationLinkController,
} from "src/modules/auth/controllers";
import { JwtRequiredInfoAccessStrategy } from "src/modules/auth/common/strategies/jwt-required-info-access.strategy";
import { MockModule } from "src/modules/mock/mock.module";
import { TokensModule } from "src/modules/tokens/tokens.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "src/modules/users/entities";
import { UserRole } from "src/modules/users/entities";
import { JwtRestorationStrategy } from "src/modules/auth/common/strategies/jwt-restoration.strategy";
import { HelperModule } from "src/modules/helper/helper.module";
import { Session } from "src/modules/sessions/entities";
import { ActivationTrackingModule } from "src/modules/activation-tracking/activation-tracking.module";
import { RemovalModule } from "src/modules/removal/removal.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserRole, Session]),
    SessionsModule,
    EmailsModule,
    MockModule,
    TokensModule,
    UsersModule,
    HelperModule,
    ActivationTrackingModule,
    RemovalModule,
  ],
  controllers: [AuthController, AuthThirdPartyController, AuthRegistrationController, AuthRegistrationLinkController],
  providers: [
    AuthService,
    AuthRegistrationService,
    AuthQueryOptionsService,
    AuthRegistrationLinkService,
    AuthThirdPartyService,
    StagingService,

    JwtRequiredInfoAccessStrategy,
    JwtRequiredInfoRefreshStrategy,
    JwtActivationAccessStrategy,
    JwtActivationRefreshStrategy,
    JwtFullAccessStrategy,
    JwtFullRefreshStrategy,

    JwtEmailConfirmationStrategy,
    JwtRegistrationStrategy,
    JwtRoleSelectionStrategy,
    JwtResetPasswordStrategy,
    JwtRestorationStrategy,

    GoogleWebStrategy,
    GoogleMobileStrategy,
    AppleWebStrategy,
    AppleMobileStrategy,
  ],
  exports: [JwtResetPasswordStrategy, AuthRegistrationLinkService],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(AddressAndDeviceAuthenticationMiddleware)
      .forRoutes(AuthController, AuthThirdPartyController, AuthRegistrationController);
  }
}
