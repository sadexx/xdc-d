import { EntityManager } from "typeorm";
import { TCreateOrUpdateDepositCharge } from "src/modules/companies-deposit-charge/common/types";

export interface IConstructAndCreateDepositChargeData {
  manager: EntityManager;
  company: TCreateOrUpdateDepositCharge;
  chargeAmount: number;
  depositDefaultChargeAmount: number;
}
