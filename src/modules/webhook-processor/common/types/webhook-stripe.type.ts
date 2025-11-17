import { FindOptionsSelect, FindOptionsRelations } from "typeorm";
import { NonNullableProperties, QueryResultType } from "src/common/types";
import { PaymentItem } from "src/modules/payments/entities";

/**
 ** Type
 */

export type TWebhookPaymentIntentSucceeded = TBaseWebhookPaymentIntentSucceeded & {
  payment: TWebhookPaymentIntentSucceededPayment;
};

export type TWebhookPaymentIntentSucceededPayment = NonNullableProperties<
  TBaseWebhookPaymentIntentSucceeded["payment"],
  "platformId"
> & {
  company: TWebhookPaymentIntentSucceededCompany;
};

export type TWebhookPaymentIntentSucceededCompany = NonNullable<
  TBaseWebhookPaymentIntentSucceeded["payment"]["company"]
> & {
  paymentInformation: NonNullable<
    NonNullable<TBaseWebhookPaymentIntentSucceeded["payment"]["company"]>["paymentInformation"]
  >;
};

/**
 ** Query types
 */

export const WebhookPaymentIntentSucceededQuery = {
  select: {
    id: true,
    fullAmount: true,
    payment: {
      id: true,
      platformId: true,
      isDepositCharge: true,
      currency: true,
      totalAmount: true,
      totalGstAmount: true,
      totalFullAmount: true,
      updatingDate: true,
      company: {
        id: true,
        platformId: true,
        name: true,
        depositAmount: true,
        contactEmail: true,
        superAdmin: { id: true, userRoles: { id: true, timezone: true, role: { name: true } } },
        paymentInformation: { stripeClientLastFour: true },
        address: { state: true, suburb: true, streetNumber: true, streetName: true, postcode: true, country: true },
      },
    },
  } as const satisfies FindOptionsSelect<PaymentItem>,
  relations: {
    payment: { company: { superAdmin: { userRoles: { role: true } }, paymentInformation: true, address: true } },
  } as const satisfies FindOptionsRelations<PaymentItem>,
};
type TBaseWebhookPaymentIntentSucceeded = QueryResultType<
  PaymentItem,
  typeof WebhookPaymentIntentSucceededQuery.select
>;

export const UpdatePaymentItemStatusByDepositChargeQuery = {
  select: {
    id: true,
    status: true,
    payment: { id: true, isDepositCharge: true },
  } as const satisfies FindOptionsSelect<PaymentItem>,
  relations: { payment: true } as const satisfies FindOptionsRelations<PaymentItem>,
};
export type TUpdatePaymentItemStatusByDepositCharge = QueryResultType<
  PaymentItem,
  typeof UpdatePaymentItemStatusByDepositChargeQuery.select
>;
