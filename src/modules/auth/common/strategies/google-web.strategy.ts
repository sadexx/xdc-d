import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, StrategyOptionsWithRequest, Profile } from "passport-google-oauth20";
import { AuthStrategies } from "src/config/strategies";
import { Request } from "express";
import { ConfigService } from "@nestjs/config";
import { IGoogleWebUserDataOutput, IThirdPartyAuthWebStateOutput } from "src/modules/auth/common/outputs";

@Injectable()
export class GoogleWebStrategy extends PassportStrategy(Strategy, AuthStrategies.GOOGLE_WEB_STRATEGY) {
  constructor(configService: ConfigService) {
    const googleOptions = configService.getOrThrow<StrategyOptionsWithRequest>("googleAuth");
    super({
      ...googleOptions,
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): Promise<IGoogleWebUserDataOutput> {
    const state: IThirdPartyAuthWebStateOutput = JSON.parse(req.query.state as string) as IThirdPartyAuthWebStateOutput;
    const { name, emails, photos } = profile;

    if (!emails || emails.length === 0 || !name || !photos || photos.length === 0) {
      throw new UnauthorizedException("Invalid user information");
    }

    const user: IGoogleWebUserDataOutput = {
      email: emails[0].value,
      firstName: name.givenName,
      lastName: name.familyName,
      picture: photos[0].value,
      role: state.role,
      platform: state.platform,
      deviceId: state.deviceId,
      deviceToken: state.deviceToken,
      iosVoipToken: state.iosVoipToken,
      clientUserAgent: state.userAgent,
      clientIPAddress: state.IPAddress,
    };

    return user;
  }
}
