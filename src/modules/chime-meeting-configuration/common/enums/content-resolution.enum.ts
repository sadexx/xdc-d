import { ValuesOf } from "src/common/types";

export const EExtVideoContentResolution = {
  HD: "HD",
  FHD: "FHD",
  NONE: "None",
} as const;

export type EExtVideoContentResolution = ValuesOf<typeof EExtVideoContentResolution>;
