import { EntityManager } from "typeorm";
import { EPaymentCurrency } from "src/modules/payments-new/common/enums";
import { IStripeOperationResult } from "src/modules/stripe/common/interfaces";
import { TChargeCompaniesDepositValidatedCompany } from "src/modules/companies-deposit-charge/common/types";
import { ICalculateDepositChargeGstAmounts } from "src/modules/companies-deposit-charge/common/interfaces";

export interface ICreateDepositChargePaymentRecordData {
  manager: EntityManager;
  stripeOperationResult: IStripeOperationResult;
  calculatedAmounts: ICalculateDepositChargeGstAmounts;
  company: TChargeCompaniesDepositValidatedCompany;
  currency: EPaymentCurrency;
}
