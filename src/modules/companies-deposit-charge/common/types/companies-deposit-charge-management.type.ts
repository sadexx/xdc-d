import { StrictOmit } from "src/common/types";
import { Company } from "src/modules/companies/entities";

/**
 ** Type
 */

export type TCreateChargeRequest = StrictOmit<
  Company,
  "depositAmount" | "depositDefaultChargeAmount" | "beforeInsert"
> & {
  depositAmount: number | null;
  depositDefaultChargeAmount: number;
};

export type TCreateOrUpdateDepositCharge = StrictOmit<
  Pick<Company, "id" | "depositAmount" | "isActive" | "depositDefaultChargeAmount">,
  "depositAmount" | "depositDefaultChargeAmount"
> & {
  depositAmount: number | null;
  depositDefaultChargeAmount: number | null;
};
