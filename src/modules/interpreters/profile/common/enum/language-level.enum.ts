import { ValuesOf } from "src/common/types";

export const ELanguageLevel = {
  ZERO: "zero",
  ONE: "one",
  TWO: "two",
  THREE: "three",
  FOUR: "four",
} as const;

export type ELanguageLevel = ValuesOf<typeof ELanguageLevel>;

export const languageLevelOrder = {
  [ELanguageLevel.ZERO]: 1,
  [ELanguageLevel.ONE]: 2,
  [ELanguageLevel.TWO]: 3,
  [ELanguageLevel.THREE]: 4,
  [ELanguageLevel.FOUR]: 5,
} as const satisfies Record<ELanguageLevel, number>;
