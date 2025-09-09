/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";
import { IJwtRegistrationPayload } from "src/modules/auth/common/interfaces";
import { TokenStrategies } from "src/config/strategies";

@Injectable()
export class JwtRestorationStrategy extends PassportStrategy(Strategy, TokenStrategies.JWT_RESTORATION_STRATEGY) {
  constructor(protected readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: Request): any => request.cookies?.["restorationToken"],
      ]),
      secretOrKey: configService.getOrThrow<string>("JWT_RESTORE_TOKEN_SECRET"),
    });
  }

  async validate(payload: IJwtRegistrationPayload): Promise<{
    id: string;
    role: string;
    email: string;
    isOauth: boolean | undefined;
    isInvitation: boolean | undefined;
    isAdditionalRole: boolean | undefined;
    clientUserAgent: string;
    clientIPAddress: string;
  }> {
    return {
      id: payload.userId,
      role: payload.userRole,
      email: payload.email,
      isOauth: payload?.isOauth,
      isInvitation: payload?.isInvitation,
      isAdditionalRole: payload?.isAdditionalRole,
      clientUserAgent: payload.clientUserAgent,
      clientIPAddress: payload.clientIPAddress,
    };
  }
}
