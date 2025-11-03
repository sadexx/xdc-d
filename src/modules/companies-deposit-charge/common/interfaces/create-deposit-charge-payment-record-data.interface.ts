import { EntityManager } from "typeorm";
import { EPaymentCurrency } from "src/modules/payments-new/common/enums";
import { TChargeCompaniesDepositValidatedCompany } from "src/modules/companies-deposit-charge/common/types";
import { ICalculateDepositChargeGstAmounts } from "src/modules/companies-deposit-charge/common/interfaces";
import { IPaymentExternalOperationResult } from "src/modules/payments-new/common/interfaces";

export interface ICreateDepositChargePaymentRecordData {
  manager: EntityManager;
  externalOperationResult: IPaymentExternalOperationResult;
  calculatedAmounts: ICalculateDepositChargeGstAmounts;
  company: TChargeCompaniesDepositValidatedCompany;
  currency: EPaymentCurrency;
}
