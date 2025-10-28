import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-custom";
import { AuthStrategies } from "src/config/strategies";
import { Request } from "express";
import { IAppleProviderOutput } from "src/modules/auth/common/interfaces";
import { AppleTokensService } from "src/modules/tokens/services";

@Injectable()
export class AppleMobileStrategy extends PassportStrategy(Strategy, AuthStrategies.APPLE_MOBILE_STRATEGY) {
  constructor(private readonly appleTokensService: AppleTokensService) {
    super();
  }

  async validate(req: Request): Promise<unknown> {
    const idToken = req.body?.idToken as string;

    if (!idToken) {
      throw new UnauthorizedException("Body doesn't include idToken field");
    }

    try {
      const result = (await this.appleTokensService.verifyToken(idToken)) as IAppleProviderOutput;

      const user = {
        email: result.email,
      };

      return user;
    } catch (error) {
      throw new UnauthorizedException((error as Error).message || "Invalid idToken");
    }
  }
}
