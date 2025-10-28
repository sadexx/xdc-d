import { FindOptionsSelect, FindOptionsRelations } from "typeorm";
import { QueryResultType } from "src/common/types";
import { Appointment } from "src/modules/appointments/appointment/entities";

/**
 ** Types
 */

export type THandleOrderRemoval = NonNullable<TCancelAppointmentPaymentFailed["appointmentOrder"]>;

/**
 ** Query types
 */

export const CancelAppointmentPaymentFailedQuery = {
  select: {
    id: true,
    status: true,
    platformId: true,
    isGroupAppointment: true,
    appointmentAdminInfo: { id: true, isRedFlagEnabled: true },
    appointmentOrder: { id: true, appointmentOrderGroup: { id: true } },
    chimeMeetingConfiguration: { id: true },
    interpreter: { id: true, user: { email: true }, profile: { preferredName: true, firstName: true, lastName: true } },
  } as const satisfies FindOptionsSelect<Appointment>,
  relations: {
    appointmentAdminInfo: true,
    appointmentOrder: { appointmentOrderGroup: true },
    chimeMeetingConfiguration: true,
    interpreter: { user: true, profile: true },
  } as const satisfies FindOptionsRelations<Appointment>,
};
export type TCancelAppointmentPaymentFailed = QueryResultType<
  Appointment,
  typeof CancelAppointmentPaymentFailedQuery.select
>;
