import { FindOptionsSelect, FindOptionsRelations } from "typeorm";
import { NonNullableProperties, QueryResultType } from "src/common/types";
import { CompanyDepositCharge } from "src/modules/companies-deposit-charge/entities";

/**
 ** Type
 */

export type TChargeCompaniesDepositValidatedCompany = NonNullableProperties<
  TChargeCompaniesDeposit["company"],
  "adminEmail" | "superAdmin"
> & {
  paymentInformation: NonNullableProperties<
    NonNullable<TChargeCompaniesDeposit["company"]["paymentInformation"]>,
    "stripeClientPaymentMethodId" | "stripeClientAccountId" | "stripeClientLastFour"
  >;
};

export type TChargeCompaniesDepositSuperAdmin =
  TChargeCompaniesDepositValidatedCompany["superAdmin"]["userRoles"][number];

/**
 ** Query types
 */

export const ChargeCompaniesDepositQuery = {
  select: {
    id: true,
    depositChargeAmount: true,
    company: {
      id: true,
      platformId: true,
      adminEmail: true,
      contactEmail: true,
      depositAmount: true,
      depositDefaultChargeAmount: true,
      country: true,
      paymentInformation: {
        id: true,
        stripeClientPaymentMethodId: true,
        stripeClientAccountId: true,
        stripeClientLastFour: true,
      },
      superAdmin: {
        id: true,
        userRoles: { id: true, role: { name: true }, profile: { preferredName: true, firstName: true } },
      },
    },
  } as const satisfies FindOptionsSelect<CompanyDepositCharge>,
  relations: {
    company: { paymentInformation: true, superAdmin: { userRoles: { role: true } } },
  } as const satisfies FindOptionsRelations<CompanyDepositCharge>,
};
export type TChargeCompaniesDeposit = QueryResultType<CompanyDepositCharge, typeof ChargeCompaniesDepositQuery.select>;
