import { OldEPaymentStatus } from "src/modules/payments/common/enums";

export interface OldICreateCorporatePayoutByStripe {
  externalId: string | null;
  paymentStatus: OldEPaymentStatus;
  paymentNote: string | null;
}
