import { ValuesOf } from "src/common/types";

export const EThirdPartyAuthProvider = {
  GOOGLE: "google",
  APPLE: "apple",
} as const;

export type EThirdPartyAuthProvider = ValuesOf<typeof EThirdPartyAuthProvider>;
