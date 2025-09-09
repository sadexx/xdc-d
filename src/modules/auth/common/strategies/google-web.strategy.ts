/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, VerifyCallback } from "passport-google-oauth20";
import { AuthStrategies } from "src/config/strategies";
import { Request } from "express";
import { ConfigService } from "@nestjs/config";
import { IGoogleWebUserDataOutput, IThirdPartyAuthWebStateOutput } from "src/modules/auth/common/outputs";

@Injectable()
export class GoogleWebStrategy extends PassportStrategy(Strategy, AuthStrategies.GOOGLE_WEB_STRATEGY) {
  constructor(configService: ConfigService) {
    super({ ...configService.getOrThrow("googleAuth") });
  }

  async validate(
    req: Request,
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const state: IThirdPartyAuthWebStateOutput = JSON.parse(req.query.state as string) as IThirdPartyAuthWebStateOutput;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { name, emails, photos } = profile;
    const user: IGoogleWebUserDataOutput = {
      email: emails[0].value as string,
      firstName: name.givenName as string,
      lastName: name.familyName as string,
      picture: photos[0].value as string,
      role: state.role,
      platform: state.platform,
      deviceId: state.deviceId,
      deviceToken: state.deviceToken,
      iosVoipToken: state.iosVoipToken,
      clientUserAgent: state.userAgent,
      clientIPAddress: state.IPAddress,
    };
    done(null, user);
  }
}
