import { FindOptionsSelect, FindOptionsRelations } from "typeorm";
import { NonNullableProperties, QueryResultType } from "src/common/types";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { Company } from "src/modules/companies/entities";
import { Payment } from "src/modules/payments/entities";

/**
 ** Type
 */

export type TLoadAppointmentTransferContext = NonNullableProperties<
  TBaseAppointmentTransferContext,
  "appointmentAdminInfo" | "businessStartTime"
> & {
  interpreter: TInterpreterTransferContext;
};

export type TInterpreterTransferContext = NonNullableProperties<
  NonNullable<TBaseAppointmentTransferContext["interpreter"]>,
  "country" | "timezone"
> & {
  paymentInformation: NonNullableProperties<
    NonNullable<NonNullable<TBaseAppointmentTransferContext["interpreter"]>["paymentInformation"]>,
    "interpreterSystemForPayout" | "stripeInterpreterAccountId" | "paypalPayerId"
  >;
  user: NonNullableProperties<NonNullable<TBaseAppointmentTransferContext["interpreter"]>["user"], "platformId">;
  address: NonNullable<NonNullable<TBaseAppointmentTransferContext["interpreter"]>["address"]>;
};

export type TLoadCompanyTransferContext = TBaseLoadCompanyTransferContext & {
  paymentInformation: NonNullableProperties<
    NonNullable<TBaseLoadCompanyTransferContext["paymentInformation"]>,
    "interpreterSystemForPayout"
  >;
};

/**
 ** Query types
 */

export const LoadAppointmentTransferContextQuery = {
  select: {
    id: true,
    platformId: true,
    communicationType: true,
    schedulingType: true,
    topic: true,
    interpreterType: true,
    interpretingType: true,
    businessStartTime: true,
    businessEndTime: true,
    interpreter: {
      id: true,
      operatedByCompanyId: true,
      country: true,
      timezone: true,
      role: { name: true },
      abnCheck: { abnStatus: true, abnNumber: true },
      paymentInformation: {
        interpreterSystemForPayout: true,
        stripeInterpreterAccountId: true,
        stripeInterpreterCardId: true,
        stripeInterpreterCardLast4: true,
        stripeInterpreterBankAccountLast4: true,
        stripeClientLastFour: true,
        paypalEmail: true,
        paypalPayerId: true,
      },
      user: { platformId: true },
      profile: { title: true, firstName: true, middleName: true, lastName: true, contactEmail: true },
      address: { streetNumber: true, streetName: true, suburb: true, state: true, postcode: true, country: true },
    },
    appointmentAdminInfo: { isInterpreterFound: true },
  } as const satisfies FindOptionsSelect<Appointment>,
  relations: {
    interpreter: { role: true, abnCheck: true, paymentInformation: true, user: true, profile: true, address: true },
    appointmentAdminInfo: true,
  } as const satisfies FindOptionsRelations<Appointment>,
};
type TBaseAppointmentTransferContext = QueryResultType<Appointment, typeof LoadAppointmentTransferContextQuery.select>;

export const LoadCompanyTransferContextQuery = {
  select: {
    id: true,
    country: true,
    platformId: true,
    paymentInformation: {
      id: true,
      interpreterSystemForPayout: true,
      stripeInterpreterCardId: true,
      stripeInterpreterCardLast4: true,
      stripeInterpreterBankAccountLast4: true,
      paypalEmail: true,
    },
  } as const satisfies FindOptionsSelect<Company>,
  relations: { paymentInformation: true } as const satisfies FindOptionsRelations<Company>,
};
type TBaseLoadCompanyTransferContext = QueryResultType<Company, typeof LoadCompanyTransferContextQuery.select>;

export const LoadPaymentTransferContextQuery = {
  select: {
    id: true,
    system: true,
    items: { id: true, status: true },
  } as const satisfies FindOptionsSelect<Payment>,
  relations: { items: true } as const satisfies FindOptionsRelations<Payment>,
};
export type TLoadPaymentTransferContext = QueryResultType<Payment, typeof LoadPaymentTransferContextQuery.select>;
