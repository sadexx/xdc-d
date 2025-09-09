/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { AuthStrategies } from "src/config/strategies";
import { Strategy } from "passport-custom";
import { IAppleProviderOutput } from "src/modules/auth/common/interfaces";
import { Request } from "express";
import { AppleTokensService } from "src/modules/tokens/services";
import { IAppleWebUserDataOutput, IThirdPartyAuthWebStateOutput } from "src/modules/auth/common/outputs";

@Injectable()
export class AppleWebStrategy extends PassportStrategy(Strategy, AuthStrategies.APPLE_WEB_STRATEGY) {
  constructor(private readonly appleTokensService: AppleTokensService) {
    super((req: Request, done: (error: unknown, user?: unknown) => void) => this.validate(req, done));
  }

  async validate(req: Request, done: (error: unknown, user?: unknown) => void): Promise<void> {
    const idToken = req.body.id_token;
    const user = req.body.user;
    const state = req.body.state;

    if (!state) {
      return done(new UnauthorizedException("Body doesn't include state field"), null);
    }

    const parsedState: IThirdPartyAuthWebStateOutput = JSON.parse(state);
    const userProfile = user ? JSON.parse(user) : null;

    let firstName = null;
    let lastName = null;

    if (userProfile) {
      firstName = userProfile.name.firstName;
      lastName = userProfile.name.lastName;
    }

    if (!idToken) {
      return done(new UnauthorizedException("Body doesn't include id_token field"), null);
    }

    try {
      const result = (await this.appleTokensService.verifyToken(idToken)) as IAppleProviderOutput;

      const user = {
        email: result.email,
        firstName,
        lastName,
        role: parsedState.role,
        platform: parsedState.platform,
        deviceId: parsedState.deviceId,
        deviceToken: parsedState.deviceToken,
        iosVoipToken: parsedState.iosVoipToken,
        clientUserAgent: parsedState.userAgent,
        clientIPAddress: parsedState.IPAddress,
      } as IAppleWebUserDataOutput;

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
}
