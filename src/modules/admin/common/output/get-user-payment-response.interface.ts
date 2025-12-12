import { PaginationOutput } from "src/common/outputs";
import { TGetUserPayments } from "src/modules/admin/common/types";

export interface IGetUserPaymentResponseOutput extends PaginationOutput {
  data: TGetUserPayments[];
}
