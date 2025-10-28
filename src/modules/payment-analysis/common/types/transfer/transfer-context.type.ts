import { FindOptionsSelect, FindOptionsRelations } from "typeorm";
import { NonNullableProperties, QueryResultType } from "src/common/types";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { Company } from "src/modules/companies/entities";
import { Payment } from "../../../../payments-new/entities";

/**
 ** Type
 */

export type TLoadAppointmentTransferContext = NonNullableProperties<
  TBaseAppointmentTransferContext,
  "appointmentAdminInfo"
> & {
  interpreter: TInterpreterTransferContext;
};

export type TInterpreterTransferContext = NonNullableProperties<
  NonNullable<TBaseAppointmentTransferContext["interpreter"]>,
  "country"
>;

/**
 ** Query types
 */

export const LoadAppointmentTransferContextQuery = {
  select: {
    id: true,
    interpreter: {
      id: true,
      operatedByCompanyId: true,
      country: true,
      role: { name: true },
      abnCheck: { abnStatus: true },
      paymentInformation: { interpreterSystemForPayout: true },
    },
    appointmentAdminInfo: { isInterpreterFound: true },
  } as const satisfies FindOptionsSelect<Appointment>,
  relations: {
    interpreter: { role: true, abnCheck: true, paymentInformation: true },
    appointmentAdminInfo: true,
  } as const satisfies FindOptionsRelations<Appointment>,
};
type TBaseAppointmentTransferContext = QueryResultType<Appointment, typeof LoadAppointmentTransferContextQuery.select>;

export const LoadCompanyTransferContextQuery = {
  select: {
    id: true,
    country: true,
  } as const satisfies FindOptionsSelect<Company>,
  relations: {} as const satisfies FindOptionsRelations<Company>,
};
export type TLoadCompanyTransferContext = QueryResultType<Company, typeof LoadCompanyTransferContextQuery.select>;

export const LoadPaymentTransferContextQuery = {
  select: {
    id: true,
    items: { id: true },
  } as const satisfies FindOptionsSelect<Payment>,
  relations: { items: true } as const satisfies FindOptionsRelations<Payment>,
};
export type TLoadPaymentTransferContext = QueryResultType<Payment, typeof LoadPaymentTransferContextQuery.select>;
