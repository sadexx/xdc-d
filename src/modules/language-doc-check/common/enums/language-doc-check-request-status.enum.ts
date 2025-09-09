import { ValuesOf } from "src/common/types";

export const ELanguageDocCheckRequestStatus = {
  INITIALIZED: "initialized",
  PENDING: "pending",
  VERIFIED: "verified",
  DOCUMENT_VERIFICATION_FAILS: "document-verification-fails",
} as const;

export type ELanguageDocCheckRequestStatus = ValuesOf<typeof ELanguageDocCheckRequestStatus>;
