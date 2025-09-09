/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";
import { IJwtPayload } from "src/modules/tokens/common/interfaces";
import { TokenStrategies } from "src/config/strategies";
import { ETokenName } from "src/modules/tokens/common/enums";

@Injectable()
export class JwtFullAccessStrategy extends PassportStrategy(Strategy, TokenStrategies.JWT_FULL_ACCESS_STRATEGY) {
  constructor(protected readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: Request): any => request.cookies?.[ETokenName.ACCESS_TOKEN],
      ]),
      secretOrKey: configService.getOrThrow<string>("JWT_ACCESS_TOKEN_SECRET"),
    });
  }

  validate(payload: IJwtPayload): {
    id: string;
    role: string;
    userRoleId: string;
    email: string;
    clientUserAgent: string;
    clientIPAddress: string;
  } {
    return {
      id: payload.userId,
      role: payload.userRole,
      userRoleId: payload.userRoleId,
      email: payload.email,
      clientUserAgent: payload.clientUserAgent,
      clientIPAddress: payload.clientIPAddress,
    };
  }
}
