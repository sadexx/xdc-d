import { EPaymentCurrency } from "src/modules/payments-new/common/enums";
import {
  TChargeCompaniesDeposit,
  TChargeCompaniesDepositValidatedCompany,
} from "src/modules/companies-deposit-charge/common/types";

export interface IAttemptStripeDepositChargeData {
  depositCharge: TChargeCompaniesDeposit;
  company: TChargeCompaniesDepositValidatedCompany;
  currency: EPaymentCurrency;
  totalFullAmount: number;
}
