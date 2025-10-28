import { EPaymentSystem } from "src/modules/payments-new/common/enums";
import { EOnboardingStatus } from "src/modules/stripe/common/enums";

export interface IGetPaymentInfoOutput {
  client: {
    last4?: string | null;
  };
  interpreter: {
    selectedSystemForPayout?: EPaymentSystem | null;
    stripe: {
      status?: EOnboardingStatus | null;
      bankAccountLast4?: string | null;
      cardLast4?: string | null;
    };
    paypal: {
      email?: string | null;
    };
  };
}
