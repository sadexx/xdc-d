import { TMakeCorporatePayOuts, TMakeCorporatePayOutsCompany } from "src/modules/payments-new/common/types";

export interface IGenerateCorporateTaxInvoiceReceipt {
  payments: TMakeCorporatePayOuts[];
  company: TMakeCorporatePayOutsCompany;
}
