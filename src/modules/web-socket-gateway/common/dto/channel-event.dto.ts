import { MessageEventDto } from "src/modules/web-socket-gateway/common/dto";

export class ChannelEventDto extends MessageEventDto {
  id?: string;
  channelArn?: string;
  messageId?: string;
}
