import { ValuesOf } from "src/common/types";

export const EDocumentType = {
  BACKYCHECK: "backycheck",
  CONCESSION_CARD: "concession-card",
  LANGUAGE_DOCS: "language-docs",
  RIGHT_TO_WORK: "right-to-work",
} as const;

export type EDocumentType = ValuesOf<typeof EDocumentType>;
