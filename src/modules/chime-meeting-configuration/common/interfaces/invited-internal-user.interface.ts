import { EUserGender, EUserRoleName } from "src/modules/users/common/enums";

export interface IInvitedInternalUser {
  id: string;
  user: { platformId: string };
  role: { name: EUserRoleName };
  profile: { firstName: string; preferredName?: string | null; lastName: string; gender: EUserGender };
}
