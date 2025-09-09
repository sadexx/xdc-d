import { ChannelMessageSummary } from "@aws-sdk/client-chime-sdk-messaging";
import { Expose } from "class-transformer";

export class GetChannelMessagesOutput {
  @Expose()
  messages: ChannelMessageSummary[];

  @Expose()
  nextToken: string | null;
}
