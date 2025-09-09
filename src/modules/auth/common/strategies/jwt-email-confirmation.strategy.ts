/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";
import { TokenStrategies } from "src/config/strategies";
import { IJwtEmailConfirmationPayload } from "src/modules/auth/common/interfaces";
import { ETokenName } from "src/modules/tokens/common/enums";

@Injectable()
export class JwtEmailConfirmationStrategy extends PassportStrategy(Strategy, TokenStrategies.JWT_EMAIL_CONFIRMATION) {
  constructor(protected readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: Request): any => request.cookies?.[ETokenName.EMAIL_CONFIRMATION_TOKEN],
      ]),
      secretOrKey: configService.getOrThrow<string>("JWT_EMAIL_CONFIRMATION_TOKEN_SECRET"),
    });
  }

  async validate(payload: IJwtEmailConfirmationPayload): Promise<{
    role: string;
    email: string;
    clientUserAgent: string;
    clientIPAddress: string;
  }> {
    return {
      role: payload.userRole,
      email: payload.email,
      clientUserAgent: payload.clientUserAgent,
      clientIPAddress: payload.clientIPAddress,
    };
  }
}
