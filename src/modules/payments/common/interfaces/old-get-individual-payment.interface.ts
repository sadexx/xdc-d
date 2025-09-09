import { OldEPaymentStatus } from "src/modules/payments/common/enums";

export interface OldIGetIndividualPayment {
  invoiceNumber: string | undefined;
  appointmentDate: string | null;
  dueDate: string | null;
  amount: string;
  status: OldEPaymentStatus;
  paymentMethod: string | null;
  internalReceiptKey: string | null;
  taxInvoiceKey: string | null;
  note: string | null;
}
