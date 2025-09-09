import { ValuesOf } from "src/common/types";

export const ERateDetailsTime = {
  FIVE: 5,
  TEN: 10,
  FIFTEEN: 15,
  THIRTY: 30,
  ONE_HOUR: 60,
  NINETY: 90,
  TWO_HOURS: 120,
  EIGHT_HOURS: 480,
} as const;

export type ERateDetailsTime = ValuesOf<typeof ERateDetailsTime>;
