/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";
import { TokenStrategies } from "src/config/strategies";
import { IJwtRoleSelectionPayload } from "src/modules/auth/common/interfaces";
import { EPlatformType } from "src/modules/sessions/common/enum";
import { ETokenName } from "src/modules/tokens/common/enums";

@Injectable()
export class JwtRoleSelectionStrategy extends PassportStrategy(Strategy, TokenStrategies.JWT_ROLE_SELECTION_STRATEGY) {
  constructor(protected readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: Request): any => request.cookies?.[ETokenName.ROLE_SELECTION_TOKEN],
      ]),
      secretOrKey: configService.getOrThrow<string>("JWT_ROLE_SELECTION_TOKEN_SECRET"),
    });
  }

  async validate(payload: IJwtRoleSelectionPayload): Promise<{
    id: string;
    email: string;
    platform: EPlatformType;
    deviceId: string;
    deviceToken: string;
    iosVoipToken: string;
    clientUserAgent: string;
    clientIPAddress: string;
  }> {
    return {
      id: payload.userId,
      email: payload.email,
      platform: payload.platform,
      deviceId: payload.deviceId,
      deviceToken: payload.deviceToken,
      iosVoipToken: payload.iosVoipToken,
      clientUserAgent: payload.clientUserAgent,
      clientIPAddress: payload.clientIPAddress,
    };
  }
}
