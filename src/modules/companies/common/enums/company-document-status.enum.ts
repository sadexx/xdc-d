import { ValuesOf } from "src/common/types";

export const ECompanyDocumentStatus = {
  PENDING: "pending",
  VERIFIED: "verified",
} as const;

export type ECompanyDocumentStatus = ValuesOf<typeof ECompanyDocumentStatus>;
