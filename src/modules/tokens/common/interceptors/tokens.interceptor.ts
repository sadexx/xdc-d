import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { NUMBER_OF_MILLISECONDS_IN_SECOND } from "src/common/constants";
import { ITokenData } from "src/modules/tokens/common/interfaces";
import { Response } from "express";
import { ETokenName } from "src/modules/tokens/common/enums";

@Injectable()
export class TokensInterceptor implements NestInterceptor {
  constructor(private readonly configService: ConfigService) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data: ITokenData) => {
        const res = context.switchToHttp().getResponse<Response>();
        const isCookieSecureModeEnabled = this.configService.getOrThrow<boolean>("COOKIE_SECURE_MODE");

        if (data?.accessToken) {
          res.cookie(ETokenName.ACCESS_TOKEN, data.accessToken, {
            sameSite: isCookieSecureModeEnabled ? "none" : "lax",
            secure: isCookieSecureModeEnabled,
            maxAge:
              Number(this.configService.getOrThrow<number>("JWT_ACCESS_TOKEN_EXPIRATION_TIME")) *
              NUMBER_OF_MILLISECONDS_IN_SECOND,
          });
        }

        if (data?.refreshToken) {
          res.cookie(ETokenName.REFRESH_TOKEN, data.refreshToken, {
            sameSite: isCookieSecureModeEnabled ? "none" : "lax",
            secure: isCookieSecureModeEnabled,
            maxAge:
              Number(this.configService.getOrThrow<number>("JWT_REFRESH_TOKEN_EXPIRATION_TIME")) *
              NUMBER_OF_MILLISECONDS_IN_SECOND,
          });
        }

        if (data?.emailConfirmationToken) {
          res.cookie(ETokenName.EMAIL_CONFIRMATION_TOKEN, data.emailConfirmationToken, {
            sameSite: isCookieSecureModeEnabled ? "none" : "lax",
            secure: isCookieSecureModeEnabled,
            maxAge:
              Number(this.configService.getOrThrow<number>("JWT_EMAIL_CONFIRMATION_TOKEN_EXPIRATION_TIME")) *
              NUMBER_OF_MILLISECONDS_IN_SECOND,
          });
        }

        if (data?.registrationToken) {
          res.cookie(ETokenName.REGISTRATION_TOKEN, data.registrationToken, {
            sameSite: isCookieSecureModeEnabled ? "none" : "lax",
            secure: isCookieSecureModeEnabled,
            maxAge:
              Number(this.configService.getOrThrow<number>("JWT_REGISTRATION_TOKEN_EXPIRATION_TIME")) *
              NUMBER_OF_MILLISECONDS_IN_SECOND,
          });
        }

        if (data?.roleSelectionToken) {
          res.cookie(ETokenName.ROLE_SELECTION_TOKEN, data.roleSelectionToken, {
            sameSite: isCookieSecureModeEnabled ? "none" : "lax",
            secure: isCookieSecureModeEnabled,
            maxAge:
              Number(this.configService.getOrThrow<number>("JWT_ROLE_SELECTION_TOKEN_EXPIRATION_TIME")) *
              NUMBER_OF_MILLISECONDS_IN_SECOND,
          });
        }

        return {
          accessToken: data?.accessToken,
          refreshToken: data?.refreshToken,
          emailConfirmationToken: data?.emailConfirmationToken,
          registrationToken: data?.registrationToken,
          registrationStep: data?.registrationStep,
          roleSelectionToken: data?.roleSelectionToken,
          availableRoles: data?.availableRoles,
        };
      }),
    );
  }
}
