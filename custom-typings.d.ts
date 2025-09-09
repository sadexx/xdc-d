import { EUserRoleName } from "./src/modules/users/common/enums";
import { IWebSocketUserData } from "./src/modules/web-socket-gateway/common/interfaces/ws-user-data.interface";

declare module "express" {
  export interface Request extends Request {
    startTime: [number, number];
    clientInfo: {
      IPAddress: string;
      userAgent: string;
    };
    user: {
      id: string;
      email: string;
      userRoleId: string;
      role: EUserRoleName;
      isOauth?: boolean;
      isInvitation?: boolean;
      clientUserAgent: string;
      clientIPAddress: string;
    };
  }
}

declare module "socket.io" {
  export interface Socket {
    user: IWebSocketUserData;
  }
}
