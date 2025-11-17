import { PaginationOutput } from "src/common/outputs";
import { EPaymentStatus } from "src/modules/payments/common/enums/core";

export interface IGetIndividualPaymentsListOutput extends PaginationOutput {
  data: IGetIndividualPaymentOutput[];
}

export interface IGetIndividualPaymentOutput {
  invoiceNumber: string | undefined;
  appointmentDate: string | null;
  dueDate: string | null;
  amount: string;
  status: EPaymentStatus;
  paymentMethod: string | null;
  internalReceiptKey: string | null;
  taxInvoiceKey: string | null;
}
