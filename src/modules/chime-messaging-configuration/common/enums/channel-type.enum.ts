import { ValuesOf } from "src/common/types";

export const EChannelType = {
  SUPPORT: "support",
  PRIVATE: "private",
} as const;

export type EChannelType = ValuesOf<typeof EChannelType>;
