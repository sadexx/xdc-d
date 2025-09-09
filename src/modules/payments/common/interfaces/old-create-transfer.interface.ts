import { OldEPaymentStatus } from "src/modules/payments/common/enums";

export interface OldICreateTransfer {
  transferId?: string;
  paymentStatus: OldEPaymentStatus;
  paymentNote: string | null;
}
