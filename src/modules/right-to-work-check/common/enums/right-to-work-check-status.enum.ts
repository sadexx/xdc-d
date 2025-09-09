import { ValuesOf } from "src/common/types";

export const ERightToWorkCheckStatus = {
  INITIALIZED: "initialized",
  PENDING: "pending",
  VERIFIED: "verified",
  DOCUMENT_VERIFICATION_FAILS: "document-verification-fails",
} as const;

export type ERightToWorkCheckStatus = ValuesOf<typeof ERightToWorkCheckStatus>;
