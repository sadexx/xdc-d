import { TMakeCorporatePayOuts, TMakeCorporatePayOutsCompany } from "src/modules/payments-new/common/types";

export interface IGenerateCorporatePayOutReceipt {
  payments: TMakeCorporatePayOuts[];
  company: TMakeCorporatePayOutsCompany;
}
