import { PaginationCursorOutput } from "src/common/outputs";
import { TGetChannelQueryBuilder } from "src/modules/chime-messaging-configuration/common/types";

export interface GetUserChannelsOutput extends PaginationCursorOutput {
  data: TGetChannelQueryBuilder[];
}
