import { TMakeCorporatePayOuts, TMakeCorporatePayOutsCompany } from "src/modules/payments/common/types/transfer";

export interface IGenerateCorporatePayOutReceipt {
  payments: TMakeCorporatePayOuts[];
  company: TMakeCorporatePayOutsCompany;
}
