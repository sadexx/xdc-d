import { FindOptionsSelect, FindOptionsRelations } from "typeorm";
import { NonNullableProperties, QueryResultType } from "src/common/types";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { Company } from "src/modules/companies/entities";
import { IncomingPaymentWaitList, Payment } from "src/modules/payments-new/entities";

/**
 ** Type
 */

export type TLoadAppointmentAuthorizationContext = NonNullableProperties<
  TBaseAppointmentAuthorizationContext,
  "appointmentOrder"
> & {
  client: TClientAuthorizationContext;
};

export type TClientAuthorizationContext = NonNullableProperties<
  NonNullable<TBaseAppointmentAuthorizationContext["client"]>,
  "country" | "timezone"
>;

export type TLoadCompanyAuthorizationContext = NonNullableProperties<TBaseCompanyAuthorizationContext, "superAdmin">;

export type TLoadCompanySuperAdminAuthorizationContext =
  TLoadCompanyAuthorizationContext["superAdmin"]["userRoles"][number];

/**
 ** Query types
 */

export const LoadAppointmentAuthorizationContextQuery = {
  select: {
    id: true,
    platformId: true,
    communicationType: true,
    schedulingType: true,
    schedulingDurationMin: true,
    topic: true,
    interpreterType: true,
    interpretingType: true,
    businessStartTime: true,
    businessEndTime: true,
    scheduledStartTime: true,
    scheduledEndTime: true,
    acceptOvertimeRates: true,
    timezone: true,
    creationDate: true,
    client: {
      id: true,
      operatedByCompanyId: true,
      operatedByMainCorporateCompanyId: true,
      country: true,
      timezone: true,
      role: { name: true },
      paymentInformation: {
        id: true,
        stripeClientAccountId: true,
        stripeClientPaymentMethodId: true,
        stripeClientLastFour: true,
      },
      user: { platformId: true },
    },
    interpreter: { id: true, timezone: true, abnCheck: { gstFromClient: true } },
    appointmentOrder: { id: true },
  } as const satisfies FindOptionsSelect<Appointment>,
  relations: {
    client: { role: true, paymentInformation: true, user: true },
    interpreter: { abnCheck: true },
    appointmentOrder: true,
  } as const satisfies FindOptionsRelations<Appointment>,
};
type TBaseAppointmentAuthorizationContext = QueryResultType<
  Appointment,
  typeof LoadAppointmentAuthorizationContextQuery.select
>;

export const LoadCompanyAuthorizationContextQuery = {
  select: {
    id: true,
    companyType: true,
    operatedByMainCompanyId: true,
    country: true,
    depositAmount: true,
    depositDefaultChargeAmount: true,
    isActive: true,
    platformId: true,
    contactEmail: true,
    superAdmin: {
      id: true,
      userRoles: { id: true, role: { name: true }, profile: { preferredName: true, firstName: true, lastName: true } },
    },
  } as const satisfies FindOptionsSelect<Company>,
  relations: {
    superAdmin: { userRoles: { role: true, profile: true } },
  } as const satisfies FindOptionsRelations<Company>,
};
type TBaseCompanyAuthorizationContext = QueryResultType<Company, typeof LoadCompanyAuthorizationContextQuery.select>;

export const LoadWaitListAuthorizationContextQuery = {
  select: {
    id: true,
  } as const satisfies FindOptionsSelect<IncomingPaymentWaitList>,
};
export type TLoadWaitListAuthorizationContext = QueryResultType<
  IncomingPaymentWaitList,
  typeof LoadWaitListAuthorizationContextQuery.select
>;

export const LoadExistingPaymentAuthorizationContextQuery = {
  select: {
    id: true,
    currency: true,
    totalAmount: true,
    totalGstAmount: true,
    totalFullAmount: true,
    items: { id: true, status: true },
  } as const satisfies FindOptionsSelect<Payment>,
  relations: { items: true } as const satisfies FindOptionsRelations<Payment>,
};
export type TLoadExistingPaymentAuthorizationContext = QueryResultType<
  Payment,
  typeof LoadExistingPaymentAuthorizationContextQuery.select
>;
