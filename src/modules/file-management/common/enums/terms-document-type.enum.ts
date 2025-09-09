import { ValuesOf } from "src/common/types";

export const ETermsDocumentType = {
  TERMS_AND_CONDITIONS: "terms-and-conditions",
  PRIVACY_TERMS: "privacy-terms",
  RATES: "rates",
} as const;

export type ETermsDocumentType = ValuesOf<typeof ETermsDocumentType>;
