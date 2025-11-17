import { TGetUserPaymentsItem } from "src/modules/admin/common/types";
import { EPaymentStatus } from "src/modules/payments/common/enums/core";

export interface IGetUserPayment {
  id: string;
  invoiceNumber: string | undefined;
  appointmentDate: string | null;
  dueDate: string | null;
  amount: string;
  status: EPaymentStatus;
  paymentMethod: string | null;
  internalReceiptKey: string | null;
  taxInvoiceKey: string | null;
  note: string | null;
  items: TGetUserPaymentsItem[];
}
