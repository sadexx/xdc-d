import { OldPayment } from "src/modules/payments/entities";
import { UserProfile } from "src/modules/users/entities";
import { PaymentInformation } from "src/modules/payment-information/entities";

export interface OldITransferReturnedInfo {
  paymentInfo: PaymentInformation;
  payment: OldPayment;
  profile: UserProfile;
}
