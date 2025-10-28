import { FindOptionsSelect, FindOptionsRelations } from "typeorm";
import { NonNullableProperties, QueryResultType } from "src/common/types";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { CheckInOutAppointmentDto } from "src/modules/appointments/appointment/common/dto";
import { UserRole } from "src/modules/users/entities";

/**
 ** Type
 */

export type TCheckInOutAppointmentDto = NonNullableProperties<
  CheckInOutAppointmentDto,
  "verifyingPersonName" | "verifyingPersonSignature"
>;

export type TCheckOutAppointment = NonNullableProperties<TCheckInOutAppointment, "appointmentExternalSession">;

/**
 ** Query types
 */

export const CheckInOutAppointmentQuery = {
  select: {
    id: true,
    platformId: true,
    clientId: true,
    interpreterId: true,
    status: true,
    communicationType: true,
    alternativePlatform: true,
    scheduledStartTime: true,
    scheduledEndTime: true,
    schedulingDurationMin: true,
    schedulingType: true,
    topic: true,
    interpreterType: true,
    interpretingType: true,
    acceptOvertimeRates: true,
    timezone: true,
    businessEndTime: true,
    businessStartTime: true,
    client: { id: true, operatedByCompanyId: true },
    interpreter: { id: true, timezone: true },
    appointmentExternalSession: { id: true, alternativeStartTime: true, alternativeEndTime: true },
  } as const satisfies FindOptionsSelect<Appointment>,
  relations: {
    client: true,
    interpreter: true,
    appointmentExternalSession: true,
  } as const satisfies FindOptionsRelations<Appointment>,
};
export type TCheckInOutAppointment = QueryResultType<Appointment, typeof CheckInOutAppointmentQuery.select>;

export const CheckInOutAlternativePlatformAppointmentUserRoleQuery = {
  select: { id: true, profile: { firstName: true, lastName: true } } as const satisfies FindOptionsSelect<UserRole>,
  relations: { profile: true } as const satisfies FindOptionsRelations<UserRole>,
};
export type TCheckInOutAlternativePlatformAppointmentUserRole = QueryResultType<
  UserRole,
  typeof CheckInOutAlternativePlatformAppointmentUserRoleQuery.select
>;
