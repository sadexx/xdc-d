import { EPaymentCurrency } from "src/modules/payments/common/enums/core";
import { Payment } from "src/modules/payments/entities";
import {
  TChargeCompaniesDepositValidatedCompany,
  TChargeCompaniesDepositSuperAdmin,
} from "src/modules/companies-deposit-charge/common/types";
import { ICalculateDepositChargeGstAmounts } from "src/modules/companies-deposit-charge/common/interfaces";

export interface IHandleDepositChargeFailureData {
  company: TChargeCompaniesDepositValidatedCompany;
  calculatedAmounts: ICalculateDepositChargeGstAmounts;
  currency: EPaymentCurrency;
  payment: Payment;
  superAdminRole: TChargeCompaniesDepositSuperAdmin;
}
