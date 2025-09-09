import { IWebSocketUserData } from "src/modules/web-socket-gateway/common/interfaces";

export interface IConnectionData {
  socketId: string;
  user: IWebSocketUserData;
  connectTime: number;
}
