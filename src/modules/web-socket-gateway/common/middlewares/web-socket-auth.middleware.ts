/* eslint-disable @typescript-eslint/no-explicit-any */
import { UnauthorizedException } from "@nestjs/common";
import { Socket } from "socket.io";
import { LokiLogger } from "src/common/logger";
import { EUserRoleName } from "src/modules/users/common/enums";
import { IJwtPayload } from "src/modules/tokens/common/interfaces";
import { JwtAccessService } from "src/modules/tokens/common/libs/access-token";
import { ETokenName } from "src/modules/tokens/common/enums";

const lokiLogger = new LokiLogger("WebSocketAuthMiddleware");

export const WebSocketAuthMiddleware = (jwtAccessService: JwtAccessService) => {
  return (client: Socket, next: (err?: any) => void): void => {
    const token = extractTokenFromSocket(client);

    if (!token) {
      lokiLogger.error("Unauthorized: No token provided");

      return next(new UnauthorizedException("Unauthorized"));
    }

    try {
      const payload: IJwtPayload = jwtAccessService.verify(token);

      client.user = {
        role: payload.userRole as EUserRoleName,
        userRoleId: payload.userRoleId,
        id: payload.userId,
        clientUserAgent: payload.clientUserAgent,
        clientIPAddress: payload.clientIPAddress,
        operatedByCompanyId: "",
        operatedByCompanyName: "",
        operatedByMainCorporateCompanyId: null,
        operatedByMainCorporateCompanyName: null,
      };

      next();
    } catch (error) {
      lokiLogger.error(`Unauthorized: Invalid token: ${(error as Error).message}, ${(error as Error).stack}`);
      next(new UnauthorizedException("Unauthorized"));
    }
  };
};

const extractTokenFromSocket = (socket: Socket): string | null => {
  const cookie = socket.handshake.headers.cookie;

  if (!cookie) {
    return null;
  }

  const cookies = cookie.split(";").map((c) => c.trim());
  const accessTokenCookie = cookies.find((c) => c.startsWith(`${ETokenName.ACCESS_TOKEN}=`));
  const accessToken = accessTokenCookie ? accessTokenCookie.split("=")[1] : null;

  return accessToken;
};
