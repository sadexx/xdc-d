import { EUserRoleName } from "src/modules/users/common/enums";

export interface IInvitedParticipant {
  id: string;
  name: string;
  role: { name: EUserRoleName };
}
