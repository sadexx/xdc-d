import { NonNullableProperties } from "src/common/types";
import { Company } from "src/modules/companies/entities";

/**
 ** Type
 */

export type TCreateChargeRequestValidated = NonNullableProperties<NonNullable<Company>, "depositDefaultChargeAmount">;

export type TCreateOrUpdateDepositCharge = Pick<
  Company,
  "id" | "depositAmount" | "isActive" | "depositDefaultChargeAmount"
>;
