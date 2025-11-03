import { NonNullableProperties } from "src/common/types";
import { IAuthorizationPaymentContext } from "src/modules/payment-analysis/common/interfaces/authorization";

/**
 ** Type
 */

export type TCreateAuthorizationPaymentRecord = NonNullableProperties<IAuthorizationPaymentContext, "prices"> & {
  appointment: IAuthorizationPaymentContext["appointment"] & {
    client: NonNullableProperties<IAuthorizationPaymentContext["appointment"]["client"], "paymentInformation"> & {
      paymentInformation: NonNullableProperties<
        NonNullable<IAuthorizationPaymentContext["appointment"]["client"]["paymentInformation"]>,
        "stripeClientLastFour"
      >;
    };
  };
};
