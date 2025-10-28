import { EPaymentCurrency } from "src/modules/payments-new/common/enums";
import { Payment } from "src/modules/payments-new/entities";
import {
  TChargeCompaniesDepositValidatedCompany,
  TChargeCompaniesDepositSuperAdmin,
} from "src/modules/companies-deposit-charge/common/types";
import { ICalculateDepositChargeGstAmounts } from "src/modules/companies-deposit-charge/common/interfaces";

export interface ISendDepositChargeFailedNotificationData {
  company: TChargeCompaniesDepositValidatedCompany;
  calculatedAmounts: ICalculateDepositChargeGstAmounts;
  currency: EPaymentCurrency;
  payment: Payment;
  superAdminRole: TChargeCompaniesDepositSuperAdmin;
}
