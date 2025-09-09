import { PaginationOutput } from "src/common/outputs";
import { IGetUserPayment } from "src/modules/admin/common/interfaces/get-user-payment.interface";

export interface IGetUserPaymentResponseOutput extends PaginationOutput {
  data: IGetUserPayment[];
}
