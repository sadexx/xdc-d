import { ValuesOf } from "src/common/types";

export const EExternalVideoResolution = {
  HD: "HD",
  FHD: "FHD",
  NONE: "None",
} as const;

export type EExternalVideoResolution = ValuesOf<typeof EExternalVideoResolution>;
