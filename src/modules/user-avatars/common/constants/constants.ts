import { EUserGender } from "src/modules/users/common/enums";

export const MALE_AVATAR = "users/avatars/default/male.png";
export const FEMALE_AVATAR = "users/avatars/default/female.png";
export const OTHER_AVATAR = "users/avatars/default/other.png";

export const avatarMap = {
  [EUserGender.MALE]: MALE_AVATAR,
  [EUserGender.FEMALE]: FEMALE_AVATAR,
  [EUserGender.OTHER]: OTHER_AVATAR,
} as const satisfies Record<EUserGender, string>;
