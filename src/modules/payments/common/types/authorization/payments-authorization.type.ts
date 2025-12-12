import { NonNullableProperties } from "src/common/types";
import { IAuthorizationPaymentContext } from "src/modules/payments-analysis/common/interfaces/authorization";

/**
 ** Type
 */

export type TAuthorizePaymentContext = NonNullableProperties<IAuthorizationPaymentContext, "prices"> & {
  appointment: IAuthorizationPaymentContext["appointment"] & {
    client: NonNullableProperties<IAuthorizationPaymentContext["appointment"]["client"], "paymentInformation"> & {
      paymentInformation: NonNullableProperties<
        NonNullable<IAuthorizationPaymentContext["appointment"]["client"]["paymentInformation"]>,
        "stripeClientLastFour" | "stripeClientAccountId" | "stripeClientPaymentMethodId"
      >;
    };
  };
};
