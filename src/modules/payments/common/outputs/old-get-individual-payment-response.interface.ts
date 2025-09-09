import { PaginationOutput } from "src/common/outputs";
import { OldIGetIndividualPayment } from "src/modules/payments/common/interfaces/old-get-individual-payment.interface";

export interface OldIGetIndividualPaymentResponseOutput extends PaginationOutput {
  data: OldIGetIndividualPayment[];
}
