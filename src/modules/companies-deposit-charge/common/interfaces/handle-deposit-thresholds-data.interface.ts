import { EntityManager } from "typeorm";
import {
  TChargeCompaniesDeposit,
  TChargeCompaniesDepositValidatedCompany,
  TChargeCompaniesDepositSuperAdmin,
} from "src/modules/companies-deposit-charge/common/types";

export interface IHandleDepositThresholdsData {
  manager: EntityManager;
  depositCharge: TChargeCompaniesDeposit;
  company: TChargeCompaniesDepositValidatedCompany;
  superAdminRole: TChargeCompaniesDepositSuperAdmin;
}
