import { FindOptionsSelect, FindOptionsRelations } from "typeorm";
import { NonNullableProperties, QueryResultType } from "src/common/types";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { Payment } from "src/modules/payments-new/entities";
import { User } from "src/modules/users/entities";
import { PaymentInformation } from "src/modules/payment-information/entities";
import { Address } from "src/modules/addresses/entities";
import { Company } from "src/modules/companies/entities";

/**
 ** Type
 */

export type TLoadAppointmentCaptureContext = NonNullableProperties<
  TBaseAppointmentCaptureContext,
  "businessStartTime"
> & {
  client: TClientCaptureContext;
  interpreter: TInterpreterCaptureContext | null;
};

export type TClientCaptureContext = NonNullableProperties<
  NonNullable<TBaseAppointmentCaptureContext["client"]>,
  "country" | "timezone"
> & {
  user: NonNullableProperties<Pick<User, "platformId">, "platformId">;
  paymentInformation: NonNullableProperties<Pick<PaymentInformation, "stripeClientLastFour">, "stripeClientLastFour">;
  address: Pick<Address, "streetNumber" | "streetName" | "suburb" | "state" | "postcode" | "country">;
};

export type TInterpreterCaptureContext = TBaseAppointmentCaptureContext["interpreter"] & {
  user: NonNullableProperties<Pick<User, "platformId">, "platformId">;
};

/**
 ** Query types
 */

export const LoadAppointmentCaptureContextQuery = {
  select: {
    id: true,
    timezone: true,
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
    client: {
      id: true,
      operatedByMainCorporateCompanyId: true,
      country: true,
      timezone: true,
      role: { name: true },
      profile: { title: true, firstName: true, middleName: true, lastName: true, contactEmail: true },
      user: { platformId: true },
      paymentInformation: { stripeClientLastFour: true },
      address: { streetNumber: true, streetName: true, suburb: true, state: true, postcode: true, country: true },
    },
    interpreter: {
      id: true,
      operatedByCompanyId: true,
      timezone: true,
      country: true,
      user: { platformId: true },
      role: { name: true },
      abnCheck: { gstFromClient: true },
    },
  } as const satisfies FindOptionsSelect<Appointment>,
  relations: {
    client: { role: true, profile: true, user: true, paymentInformation: true, address: true },
    interpreter: { user: true, role: true, abnCheck: true },
  } as const satisfies FindOptionsRelations<Appointment>,
};
type TBaseAppointmentCaptureContext = QueryResultType<Appointment, typeof LoadAppointmentCaptureContextQuery.select>;

export const LoadPaymentCaptureContextQuery = {
  select: {
    id: true,
    system: true,
    direction: true,
    currency: true,
    totalAmount: true,
    totalGstAmount: true,
    totalFullAmount: true,
    estimatedCostAmount: true,
    updatingDate: true,
    company: {
      id: true,
      country: true,
      depositAmount: true,
      platformCommissionRate: true,
      platformId: true,
      name: true,
      address: { streetNumber: true, streetName: true, suburb: true, state: true, postcode: true, country: true },
    },
    items: { id: true, amount: true, gstAmount: true, fullAmount: true, externalId: true, status: true },
  } as const satisfies FindOptionsSelect<Payment>,
  relations: { company: { address: true }, items: true } as const satisfies FindOptionsRelations<Payment>,
};
export type TLoadPaymentCaptureContext = QueryResultType<Payment, typeof LoadPaymentCaptureContextQuery.select>;

export const LoadInterpreterCompanyCaptureContextQuery = {
  select: {
    id: true,
    country: true,
  } as const satisfies FindOptionsSelect<Company>,
};
export type TLoadInterpreterCompanyCaptureContext = QueryResultType<
  Company,
  typeof LoadInterpreterCompanyCaptureContextQuery.select
>;
