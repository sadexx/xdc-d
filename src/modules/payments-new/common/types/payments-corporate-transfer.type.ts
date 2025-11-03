import { NonNullableProperties, QueryResultType } from "src/common/types";
import { FindOptionsRelations, FindOptionsSelect } from "typeorm";
import { Payment } from "src/modules/payments-new/entities";

/**
 ** Type
 */

export type TMakeCorporatePayOuts = TBaseMakeCorporatePayouts & {
  company: TMakeCorporatePayOutsCompany;
  appointment: NonNullableProperties<NonNullable<TBaseMakeCorporatePayouts["appointment"]>, "businessStartTime"> & {
    interpreter: NonNullableProperties<
      NonNullable<NonNullable<TBaseMakeCorporatePayouts["appointment"]>["interpreter"]>,
      "timezone"
    >;
  };
};

export type TMakeCorporatePayOutsCompany = NonNullable<TBaseMakeCorporatePayouts["company"]> & {
  paymentInformation: NonNullableProperties<
    NonNullable<NonNullable<TBaseMakeCorporatePayouts["company"]>["paymentInformation"]>,
    "stripeInterpreterAccountId" | "stripeInterpreterCardId" | "stripeInterpreterCardLast4" | "paypalPayerId"
  >;
};

/**
 ** Query types
 */

export const MakeCorporatePayOutsQuery = {
  select: {
    id: true,
    totalAmount: true,
    totalFullAmount: true,
    totalGstAmount: true,
    currency: true,
    company: {
      id: true,
      platformId: true,
      name: true,
      abnNumber: true,
      contactEmail: true,
      paymentInformation: {
        interpreterSystemForPayout: true,
        stripeInterpreterAccountId: true,
        stripeInterpreterCardId: true,
        stripeInterpreterCardLast4: true,
        stripeInterpreterBankAccountLast4: true,
        paypalPayerId: true,
        paypalEmail: true,
      },
      address: { streetNumber: true, streetName: true, suburb: true, state: true, postcode: true, country: true },
      superAdmin: { id: true, userRoles: { id: true, profile: { firstName: true } } },
    },
    appointment: {
      id: true,
      platformId: true,
      communicationType: true,
      schedulingType: true,
      interpreterType: true,
      businessStartTime: true,
      businessEndTime: true,
      topic: true,
      interpreter: { id: true, timezone: true, user: { id: true, platformId: true } },
    },
  } as const satisfies FindOptionsSelect<Payment>,
  relations: {
    company: { paymentInformation: true, address: true, superAdmin: { userRoles: { profile: true } } },
    appointment: { interpreter: true },
  } as const satisfies FindOptionsRelations<Payment>,
};
type TBaseMakeCorporatePayouts = QueryResultType<Payment, typeof MakeCorporatePayOutsQuery.select>;
