import { EChannelType } from "src/modules/chime-messaging-configuration/common/enums";

export interface IChatMessageOutput {
  channelId: string;
  channelType: EChannelType;
}
