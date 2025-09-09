import { ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { decode, Jwt, JwtPayload, verify } from "jsonwebtoken";
import { JwksClient } from "jwks-rsa";
import { NUMBER_OF_MILLISECONDS_IN_SECOND } from "src/common/constants";
import { LokiLogger } from "src/common/logger";

@Injectable()
export class AppleTokensService {
  private lokiLogger = new LokiLogger(AppleTokensService.name);
  private jwksClient: JwksClient;

  constructor() {
    this.jwksClient = new JwksClient({
      jwksUri: "https://appleid.apple.com/auth/keys",
    });
  }

  async verifyToken(idToken: string): Promise<string | JwtPayload> {
    const decodedToken = await this.decodeToken(idToken);

    if (!decodedToken) {
      throw new ForbiddenException("Can't decode token");
    }

    this.checkTokenExpiration(decodedToken);
    const publicKey = await this.getPublicKey(decodedToken);

    return this.verifyTokenWithPublicKey(idToken, publicKey, decodedToken);
  }

  async decodeToken(idToken: string): Promise<Jwt | null> {
    try {
      return decode(idToken, { complete: true });
    } catch (error) {
      this.lokiLogger.error(`Error while decoding token: ${(error as Error).message}, ${(error as Error).stack}`);
      throw new ForbiddenException("Can't decode token");
    }
  }

  checkTokenExpiration(decodedToken: JwtPayload): void {
    if (decodedToken.payload?.exp < new Date().getTime() / NUMBER_OF_MILLISECONDS_IN_SECOND) {
      throw new UnauthorizedException("Token has expired");
    }
  }

  async getPublicKey(decodedToken: Jwt): Promise<string> {
    try {
      const signingKey = await this.jwksClient.getSigningKey(decodedToken.header.kid);

      return signingKey.getPublicKey();
    } catch (error) {
      this.lokiLogger.error(
        `Error while retrieving the public key: ${(error as Error).message}, ${(error as Error).stack}`,
      );
      throw new ForbiddenException("Unable to retrieve the public key");
    }
  }

  async verifyTokenWithPublicKey(idToken: string, publicKey: string, decodedToken: Jwt): Promise<string | JwtPayload> {
    try {
      const verifiedData = verify(idToken, publicKey);

      if (decodedToken.payload.sub !== verifiedData.sub) {
        throw new ForbiddenException("Key signatures do not match");
      }

      return verifiedData;
    } catch (error) {
      throw new ForbiddenException((error as Error).message);
    }
  }
}
