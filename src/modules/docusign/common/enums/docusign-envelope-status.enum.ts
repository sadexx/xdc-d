import { ValuesOf } from "src/common/types";

export const EExtDocusignStatus = {
  COMPLETED: "completed",
  CREATED: "created",
  DECLINED: "declined",
  DELIVERED: "delivered",
  SENT: "sent",
  SIGNED: "signed",
  VOIDED: "voided",
} as const;

export type EExtDocusignStatus = ValuesOf<typeof EExtDocusignStatus>;
