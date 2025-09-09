import { PaginationOutput } from "src/common/outputs";
import { TGetChannelQueryBuilder } from "src/modules/chime-messaging-configuration/common/types";

export interface GetAdminChannelsOutput extends PaginationOutput {
  data: TGetChannelQueryBuilder[];
}
