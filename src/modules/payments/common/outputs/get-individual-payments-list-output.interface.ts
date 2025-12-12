import { PaginationOutput } from "src/common/outputs";
import { TGetIndividualPayments } from "src/modules/payments/common/types/core";

export interface IGetIndividualPaymentsListOutput extends PaginationOutput {
  data: TGetIndividualPayments[];
}
