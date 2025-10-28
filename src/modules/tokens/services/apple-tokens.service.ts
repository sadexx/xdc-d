import { ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { decode, Jwt, JwtPayload, verify } from "jsonwebtoken";
import { JwksClient } from "jwks-rsa";
import { NUMBER_OF_MILLISECONDS_IN_SECOND } from "src/common/constants";
import { LokiLogger } from "src/common/logger";
import { ETokensErrorCodes } from "src/modules/tokens/common/enums";

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
      throw new ForbiddenException(ETokensErrorCodes.TOKEN_DECODE_FAILED);
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
      throw new ForbiddenException(ETokensErrorCodes.TOKEN_DECODE_FAILED);
    }
  }

  checkTokenExpiration(decodedToken: JwtPayload): void {
    if (decodedToken.payload?.exp < new Date().getTime() / NUMBER_OF_MILLISECONDS_IN_SECOND) {
      throw new UnauthorizedException(ETokensErrorCodes.TOKEN_EXPIRED);
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
      throw new ForbiddenException(ETokensErrorCodes.PUBLIC_KEY_RETRIEVAL_FAILED);
    }
  }

  async verifyTokenWithPublicKey(idToken: string, publicKey: string, decodedToken: Jwt): Promise<string | JwtPayload> {
    try {
      const verifiedData = verify(idToken, publicKey);

      if (decodedToken.payload.sub !== verifiedData.sub) {
        throw new ForbiddenException(ETokensErrorCodes.KEY_SIGNATURES_MISMATCH);
      }

      return verifiedData;
    } catch (error) {
      this.lokiLogger.error(`Failed to verify token: ${(error as Error).message}`);
      throw new ForbiddenException(ETokensErrorCodes.TOKEN_VERIFICATION_FAILED);
    }
  }
}
