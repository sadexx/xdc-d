import { Company } from "src/modules/companies/entities";

export interface IDepositCharge {
  depositChargeAmount: number;
  company: Company;
}
