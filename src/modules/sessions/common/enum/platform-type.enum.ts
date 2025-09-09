import { ValuesOf } from "src/common/types";

export const EPlatformType = {
  WEB: "web",
  ANDROID: "android",
  IOS: "ios",
} as const;

export type EPlatformType = ValuesOf<typeof EPlatformType>;
