import { FindOptionsSelect, FindOptionsRelations } from "typeorm";
import { NonNullableProperties, QueryResultType, StrictOmit } from "src/common/types";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { Company } from "src/modules/companies/entities";
import { Payment } from "src/modules/payments/entities";

/**
 ** Type
 */

export type TLoadAppointmentAuthorizationRecreateContext = TBaseLoadAppointmentAuthorizationRecreateContext & {
  client: TClientAuthorizationRecreateContext;
};

export type TClientAuthorizationRecreateContext = NonNullableProperties<
  NonNullable<TBaseLoadAppointmentAuthorizationRecreateContext["client"]>,
  "country" | "timezone"
>;

export type TLoadOldPaymentAuthorizationRecreateContext = StrictOmit<
  TBaseLoadOldPaymentAuthorizationRecreateContext,
  "items"
> & { items: NonNullableProperties<TBaseLoadOldPaymentAuthorizationRecreateContext["items"][number], "externalId">[] };

export type TOldPaymentAuthorizationRecreateContext = StrictOmit<
  TLoadOldPaymentAuthorizationRecreateContext,
  "totalAmount" | "totalGstAmount" | "items"
> & {
  totalAmount: number;
  totalGstAmount: number;
  items: (StrictOmit<
    NonNullableProperties<TBaseLoadOldPaymentAuthorizationRecreateContext["items"][number], "externalId">,
    "fullAmount"
  > & { fullAmount: number })[];
};

export type TCompanyAuthorizationRecreateContext = StrictOmit<
  TLoadCompanyAuthorizationRecreateContext,
  "depositAmount"
> & {
  depositAmount: number | null;
};

/**
 ** Query types
 */

export const LoadAppointmentAuthorizationRecreateContextQuery = {
  select: {
    id: true,
    platformId: true,
    scheduledStartTime: true,
    scheduledEndTime: true,
    communicationType: true,
    schedulingType: true,
    schedulingDurationMin: true,
    topic: true,
    interpreterType: true,
    interpretingType: true,
    businessStartTime: true,
    businessEndTime: true,
    acceptOvertimeRates: true,
    timezone: true,
    status: true,
    isGroupAppointment: true,
    appointmentsGroupId: true,
    creationDate: true,
    client: {
      id: true,
      operatedByMainCorporateCompanyId: true,
      operatedByCompanyId: true,
      country: true,
      timezone: true,
      role: { name: true },
    },
    interpreter: { id: true, timezone: true, abnCheck: { gstFromClient: true } },
  } as const satisfies FindOptionsSelect<Appointment>,
  relations: {
    client: { role: true },
    interpreter: { abnCheck: true },
  } as const satisfies FindOptionsRelations<Appointment>,
};
type TBaseLoadAppointmentAuthorizationRecreateContext = QueryResultType<
  Appointment,
  typeof LoadAppointmentAuthorizationRecreateContextQuery.select
>;

export const LoadCompanyAuthorizationRecreateContextQuery = {
  select: {
    id: true,
    country: true,
    depositAmount: true,
  } as const satisfies FindOptionsSelect<Company>,
};
export type TLoadCompanyAuthorizationRecreateContext = QueryResultType<
  Company,
  typeof LoadCompanyAuthorizationRecreateContextQuery.select
>;

export const LoadOldPaymentAuthorizationRecreateContextQuery = {
  select: {
    id: true,
    totalAmount: true,
    totalGstAmount: true,
    system: true,
    direction: true,
    items: { id: true, externalId: true, status: true, fullAmount: true },
  } as const satisfies FindOptionsSelect<Payment>,
  relations: { items: true } as const satisfies FindOptionsRelations<Payment>,
};
type TBaseLoadOldPaymentAuthorizationRecreateContext = QueryResultType<
  Payment,
  typeof LoadOldPaymentAuthorizationRecreateContextQuery.select
>;
