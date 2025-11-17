import { EPaymentCurrency } from "src/modules/payments/common/enums/core";
import { TChargeCompaniesDepositValidatedCompany } from "src/modules/companies-deposit-charge/common/types";
import { ICalculateDepositChargeGstAmounts } from "src/modules/companies-deposit-charge/common/interfaces";
import { IPaymentExternalOperationResult } from "src/modules/payments/common/interfaces/management";

export interface ICreateDepositChargePaymentRecordData {
  externalOperationResult: IPaymentExternalOperationResult;
  calculatedAmounts: ICalculateDepositChargeGstAmounts;
  company: TChargeCompaniesDepositValidatedCompany;
  currency: EPaymentCurrency;
}
