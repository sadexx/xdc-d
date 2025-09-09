import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { OAuth2Client, TokenPayload } from "google-auth-library";
import { Strategy, VerifiedCallback } from "passport-custom";
import { AuthStrategies } from "src/config/strategies";
import { Request } from "express";
import { LokiLogger } from "src/common/logger";

const lokiLogger = new LokiLogger("GoogleMobileStrategy");

@Injectable()
export class GoogleMobileStrategy extends PassportStrategy(Strategy, AuthStrategies.GOOGLE_MOBILE_STRATEGY) {
  constructor(private readonly configService: ConfigService) {
    super((req: Request, done: VerifiedCallback) => this.validate(req, done));
  }

  async validate(req: Request, done: VerifiedCallback): Promise<void> {
    const idToken = req.body?.idToken as string;

    if (!idToken) {
      return done(new UnauthorizedException("Body doesn't include idToken field"), null);
    }

    const payload = await this.verifyToken(idToken);

    if (!payload) {
      return done(new UnauthorizedException("Can't verify idToken"), null);
    }

    const user = {
      email: payload.email,
      fullName: payload.name,
    };

    done(null, user);
  }

  async verifyToken(idToken: string): Promise<false | TokenPayload | undefined> {
    try {
      const clientId = this.configService.getOrThrow<string>("googleAuth.clientID");

      const client = new OAuth2Client();
      const ticket = await client.verifyIdToken({
        idToken: idToken,
        audience: clientId,
      });

      return ticket.getPayload();
    } catch (error) {
      lokiLogger.error(`Error while verifying token: ${(error as Error).message}, ${(error as Error).stack}`);

      return false;
    }
  }
}
