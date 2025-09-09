/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, VerifiedCallback } from "passport-custom";
import { AuthStrategies } from "src/config/strategies";
import { Request } from "express";
import { IAppleProviderOutput } from "src/modules/auth/common/interfaces";
import { AppleTokensService } from "src/modules/tokens/services";

@Injectable()
export class AppleMobileStrategy extends PassportStrategy(Strategy, AuthStrategies.APPLE_MOBILE_STRATEGY) {
  constructor(private readonly appleTokensService: AppleTokensService) {
    super((req: Request, done: VerifiedCallback) => this.validate(req, done));
  }

  async validate(req: Request, done: VerifiedCallback): Promise<void> {
    const idToken = req.body?.idToken as string;

    if (!idToken) {
      return done(new UnauthorizedException("Body doesn't include idToken field"), null);
    }

    try {
      const result = (await this.appleTokensService.verifyToken(idToken)) as IAppleProviderOutput;

      const user = {
        email: result.email,
      };

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
}
