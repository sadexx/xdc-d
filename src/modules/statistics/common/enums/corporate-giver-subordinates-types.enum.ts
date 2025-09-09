import { ValuesOf } from "src/common/types";

export const ECorporateInterpreterSubordinatesTypes = {
  ALL: "all",
  CORPORATE_CLIENTS: "corporate-clients",
  CORPORATE_INDIVIDUAL_INTERPRETERS: "corporate-individual-professional-interpreters",
} as const;

export type ECorporateInterpreterSubordinatesTypes = ValuesOf<typeof ECorporateInterpreterSubordinatesTypes>;
