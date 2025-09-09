import { ValuesOf } from "src/common/types";

export const EUserConcessionCardStatus = {
  INITIALIZED: "initialized",
  PENDING: "pending",
  VERIFIED: "verified",
  DOCUMENT_VERIFICATION_FAILS: "document-verification-fails",
} as const;

export type EUserConcessionCardStatus = ValuesOf<typeof EUserConcessionCardStatus>;
