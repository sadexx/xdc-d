import { FindOptionsSelect } from "typeorm";
import { NonNullableProperties, QueryResultType } from "src/common/types";
import { Channel } from "src/modules/chime-messaging-configuration/entities";
import { UserRole } from "src/modules/users/entities";
import { TGetChannelAppointment } from "src/modules/chime-messaging-configuration/common/types";
import { Appointment } from "src/modules/appointments/appointment/entities";

export type TResolveSingleAppointmentChannel = NonNullableProperties<TGetChannelAppointment, "channelId">;

/**
 ** Query types
 */

export const ResolveChannelQuery = {
  select: { id: true, status: true, operatedByCompanyId: true } as const satisfies FindOptionsSelect<Channel>,
};
export type TResolveChannel = QueryResultType<Channel, typeof ResolveChannelQuery.select>;

export const ResolveChannelUserRoleQuery = {
  select: { id: true, operatedByCompanyId: true } as const satisfies FindOptionsSelect<UserRole>,
};
export type TResolveChannelUserRole = QueryResultType<Channel, typeof ResolveChannelUserRoleQuery.select>;

export const ResolveChannelForAppointmentGroupQuery = {
  select: { id: true, status: true } as const satisfies FindOptionsSelect<Channel>,
};
export type TResolveChannelForAppointmentGroup = QueryResultType<
  Channel,
  typeof ResolveChannelForAppointmentGroupQuery.select
>;

export const ClassifyChannelsForResolutionQuery = {
  select: { id: true, status: true, channelId: true } as const satisfies FindOptionsSelect<Appointment>,
};
export type TClassifyChannelsForResolution = QueryResultType<
  Appointment,
  typeof ClassifyChannelsForResolutionQuery.select
>;
