import { FindOptionsSelect, FindOptionsRelations } from "typeorm";
import { NonNullableProperties, QueryResultType, StrictOmit } from "src/common/types";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { Company } from "src/modules/companies/entities";
import { Payment } from "src/modules/payments/entities";

/**
 ** Type
 */

export type TLoadAppointmentAuthorizationCancelContext = TBaseAppointmentAuthorizationCancelContext & {
  client: TClientAuthorizationCancelContext;
};

export type TClientAuthorizationCancelContext = NonNullable<TBaseAppointmentAuthorizationCancelContext["client"]>;

export type TLoadPaymentAuthorizationCancelContext = StrictOmit<TBasePaymentAuthorizationCancelContext, "items"> & {
  items: NonNullableProperties<TBasePaymentAuthorizationCancelContext["items"][number], "externalId">[];
};

export type TPaymentAuthorizationCancelContext = StrictOmit<TLoadPaymentAuthorizationCancelContext, "items"> & {
  items: TPaymentItemAuthorizationCancelContext[];
};

export type TPaymentItemAuthorizationCancelContext = NonNullableProperties<
  StrictOmit<TLoadPaymentAuthorizationCancelContext["items"][number], "fullAmount">,
  "externalId"
> & {
  fullAmount: number;
};

export type TCompanyAuthorizationCancelContext = StrictOmit<TLoadCompanyAuthorizationCancelContext, "depositAmount"> & {
  depositAmount: number | null;
};

/**
 ** Query types
 */

export const LoadAppointmentAuthorizationCancelContextQuery = {
  select: {
    id: true,
    scheduledStartTime: true,
    communicationType: true,
    status: true,
    creationDate: true,
    client: { id: true, operatedByCompanyId: true, operatedByMainCorporateCompanyId: true, role: { name: true } },
  } as const satisfies FindOptionsSelect<Appointment>,
  relations: { client: { role: true } } as const satisfies FindOptionsRelations<Appointment>,
};
type TBaseAppointmentAuthorizationCancelContext = QueryResultType<
  Appointment,
  typeof LoadAppointmentAuthorizationCancelContextQuery.select
>;

export const LoadPaymentAuthorizationCancelContextQuery = {
  select: {
    id: true,
    system: true,
    direction: true,
    items: { id: true, externalId: true, status: true, fullAmount: true },
  } as const satisfies FindOptionsSelect<Payment>,
  relations: { items: true } as const satisfies FindOptionsRelations<Payment>,
};
type TBasePaymentAuthorizationCancelContext = QueryResultType<
  Payment,
  typeof LoadPaymentAuthorizationCancelContextQuery.select
>;

export const LoadCompanyAuthorizationCancelContextQuery = {
  select: {
    id: true,
    depositAmount: true,
    fundingSource: true,
  } as const satisfies FindOptionsSelect<Company>,
};
export type TLoadCompanyAuthorizationCancelContext = QueryResultType<
  Company,
  typeof LoadCompanyAuthorizationCancelContextQuery.select
>;
