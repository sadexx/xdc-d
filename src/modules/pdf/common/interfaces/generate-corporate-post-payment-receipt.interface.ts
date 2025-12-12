import {
  TGenerateCorporatePostPaymentReceipt,
  TGenerateCorporatePostPaymentReceiptCompany,
} from "src/modules/admin/common/types";

export interface IGenerateCorporatePostPaymentReceipt {
  payments: TGenerateCorporatePostPaymentReceipt[];
  company: TGenerateCorporatePostPaymentReceiptCompany;
}
