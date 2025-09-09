import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { AddressAndDeviceAuthenticationMiddleware } from "src/modules/auth/common/middlewares";
import { AuthController, AuthRegistrationController, AuthThirdPartyController } from "src/modules/auth/controllers";
import { JwtEmailConfirmationModule } from "src/modules/tokens/common/libs/email-confirmation-token";
import { JwtRoleSelectionModule } from "src/modules/tokens/common/libs/role-selection-token";
import { JwtRegistrationModule } from "src/modules/tokens/common/libs/registration-token";
import { AppleTokensService, TokensService } from "src/modules/tokens/services";
import { JwtRequiredInfoAccessModule } from "src/modules/tokens/common/libs/required-info-access-token/jwt-required-info-access.module";
import { JwtRequiredInfoRefreshModule } from "src/modules/tokens/common/libs/required-info-refresh-token/jwt-required-info-refresh.module";
import { JwtActivationAccessModule } from "src/modules/tokens/common/libs/activation-access-token";
import { JwtActivationRefreshModule } from "src/modules/tokens/common/libs/activation-refresh-token";
import { JwtAccessModule, JwtAccessService } from "src/modules/tokens/common/libs/access-token";
import { JwtRefreshModule } from "src/modules/tokens/common/libs/refresh-token";
import { JwtResetPasswordModule } from "src/modules/tokens/common/libs/reset-password-token";
import { JwtRestorationModule } from "src/modules/tokens/common/libs/restoration-token";

@Module({
  imports: [
    JwtRegistrationModule,
    JwtRoleSelectionModule,
    JwtEmailConfirmationModule,
    JwtRequiredInfoAccessModule,
    JwtRequiredInfoRefreshModule,
    JwtActivationAccessModule,
    JwtActivationRefreshModule,
    JwtAccessModule,
    JwtRefreshModule,
    JwtResetPasswordModule,
    JwtRestorationModule,
  ],
  providers: [AppleTokensService, TokensService, JwtAccessService],
  exports: [AppleTokensService, TokensService, JwtAccessService],
})
export class TokensModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(AddressAndDeviceAuthenticationMiddleware)
      .forRoutes(AuthController, AuthThirdPartyController, AuthRegistrationController);
  }
}
