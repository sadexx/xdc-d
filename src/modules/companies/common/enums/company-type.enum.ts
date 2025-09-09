import { ValuesOf } from "src/common/types";

export const ECompanyType = {
  CORPORATE_CLIENTS: "corporate-clients",
  CORPORATE_INTERPRETING_PROVIDERS: "corporate-interpreting-providers",
  CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS: "corporate-interpreting-provider-corporate-clients",
} as const;

export type ECompanyType = ValuesOf<typeof ECompanyType>;
