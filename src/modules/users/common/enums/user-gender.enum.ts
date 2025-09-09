import { ValuesOf } from "src/common/types";

export const EUserGender = {
  MALE: "m-(male)",
  FEMALE: "f-(female)",
  OTHER: "other",
} as const;

export type EUserGender = ValuesOf<typeof EUserGender>;

export const userGenderOrder = {
  [EUserGender.MALE]: 1,
  [EUserGender.FEMALE]: 2,
  [EUserGender.OTHER]: 3,
} as const satisfies Record<EUserGender, number>;
