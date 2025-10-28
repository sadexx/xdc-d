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
    super();
  }

  async validate(req: Request): Promise<IAppleWebUserDataOutput> {
    const idToken = req.body.id_token;
    const rawUser = req.body.user;
    const state = req.body.state;

    if (!state) {
      throw new UnauthorizedException("Body doesn't include state field");
    }

    const parsedState: IThirdPartyAuthWebStateOutput = JSON.parse(state);
    const userProfile = rawUser ? JSON.parse(rawUser) : null;

    let firstName = null;
    let lastName = null;

    if (userProfile) {
      firstName = userProfile.name.firstName;
      lastName = userProfile.name.lastName;
    }

    if (!idToken) {
      throw new UnauthorizedException("Body doesn't include id_token field");
    }

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

    return user;
  }
}
