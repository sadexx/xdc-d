import { TMakeCorporatePayOuts, TMakeCorporatePayOutsCompany } from "src/modules/payments/common/types/transfer";

export interface IGenerateCorporateTaxInvoiceReceipt {
  payments: TMakeCorporatePayOuts[];
  company: TMakeCorporatePayOutsCompany;
}
