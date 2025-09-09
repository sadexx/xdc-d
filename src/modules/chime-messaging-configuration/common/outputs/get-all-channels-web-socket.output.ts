import { TGetChannelQueryBuilder } from "src/modules/chime-messaging-configuration/common/types";

export interface IGetAllChannelsWebSocketOutput {
  privateChannels: TGetChannelQueryBuilder[];
  supportChannels: TGetChannelQueryBuilder[];
}
