/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";
import { TokenStrategies } from "src/config/strategies";
import { IJwtPayload } from "src/modules/tokens/common/interfaces";
import { ETokenName } from "src/modules/tokens/common/enums";

@Injectable()
export class JwtResetPasswordStrategy extends PassportStrategy(Strategy, TokenStrategies.JWT_RESET_PASSWORD_STRATEGY) {
  constructor(protected configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: Request): any => request.cookies?.[ETokenName.ACCESS_TOKEN],
      ]),
      secretOrKey: configService.getOrThrow<string>("JWT_RESET_PASSWORD_TOKEN_SECRET"),
    });
  }

  async validate(payload: IJwtPayload): Promise<{
    id: string;
    role: string;
    email: string;
    clientUserAgent: string;
    clientIPAddress: string;
  }> {
    return {
      id: payload.userId,
      role: payload.userRole,
      email: payload.email,
      clientUserAgent: payload.clientUserAgent,
      clientIPAddress: payload.clientIPAddress,
    };
  }
}
