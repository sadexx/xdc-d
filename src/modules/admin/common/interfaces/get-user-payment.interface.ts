import { OldEPaymentStatus } from "src/modules/payments/common/enums";
import { OldPaymentItem } from "src/modules/payments/entities";

export interface IGetUserPayment {
  id: string;
  invoiceNumber: string | undefined;
  appointmentDate: string | null;
  dueDate: string | null;
  amount: string;
  status: OldEPaymentStatus;
  paymentMethod: string | null;
  internalReceiptKey: string | null;
  taxInvoiceKey: string | null;
  note: string | null;
  items: OldPaymentItem[];
}
