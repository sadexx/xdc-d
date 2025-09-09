import { EChannelMembershipType } from "src/modules/chime-messaging-configuration/common/enums";
import { Channel } from "src/modules/chime-messaging-configuration/entities";
import { UserRole } from "src/modules/users/entities";

export interface ICreateChannelMembershipConfig {
  instanceUserArn: string | null;
  type: EChannelMembershipType;
  channel: Channel;
  userRole: UserRole;
}
