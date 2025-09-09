import { ValuesOf } from "src/common/types";

export const EUserRoleName = {
  SUPER_ADMIN: "super-admin",
  LFH_BOOKING_OFFICER: "lfh-booking-officer",
  IND_CLIENT: "ind-client",
  IND_PROFESSIONAL_INTERPRETER: "ind-professional-interpreter",
  IND_LANGUAGE_BUDDY_INTERPRETER: "ind-language-buddy-interpreter",
  INVITED_GUEST: "invited-guest",
  CORPORATE_CLIENTS_SUPER_ADMIN: "corporate-clients-super-admin",
  CORPORATE_CLIENTS_ADMIN: "corporate-clients-admin",
  CORPORATE_CLIENTS_RECEPTIONIST: "corporate-clients-receptionist",
  CORPORATE_CLIENTS_IND_USER: "corporate-clients-ind-user",
  CORPORATE_INTERPRETING_PROVIDERS_SUPER_ADMIN: "corporate-interpreting-providers-super-admin",
  CORPORATE_INTERPRETING_PROVIDERS_ADMIN: "corporate-interpreting-providers-admin",
  CORPORATE_INTERPRETING_PROVIDERS_RECEPTIONIST: "corporate-interpreting-providers-receptionist",
  CORPORATE_INTERPRETING_PROVIDERS_IND_INTERPRETER: "corporate-interpreting-providers-ind-interpreter",
  CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_SUPER_ADMIN:
    "corporate-interpreting-provider-corporate-clients-super-admin",
  CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_ADMIN: "corporate-interpreting-provider-corporate-clients-admin",
  CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_RECEPTIONIST:
    "corporate-interpreting-provider-corporate-clients-receptionist",
  CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_IND_USER:
    "corporate-interpreting-provider-corporate-clients-ind-user",
} as const;

export type EUserRoleName = ValuesOf<typeof EUserRoleName>;
