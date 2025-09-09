import { FindOptionsRelations, FindOptionsSelect } from "typeorm";
import { QueryResultType } from "src/common/types";
import { Channel, ChannelMembership } from "src/modules/chime-messaging-configuration/entities";
import { UserRole } from "src/modules/users/entities";
import { User, UserProfile } from "src/modules/users/entities";
import { Role } from "src/modules/users/entities";
import { Appointment } from "src/modules/appointments/appointment/entities";

/**
 ** Query types
 */

export const MessagingQueryUserRoleQuery = {
  select: {
    id: true,
    operatedByCompanyId: true,
    role: {
      id: true,
      name: true,
    },
  } as const satisfies FindOptionsSelect<UserRole>,
  relations: { role: true } as const satisfies FindOptionsRelations<UserRole>,
};
export type TMessagingQueryUserRole = QueryResultType<UserRole, typeof MessagingQueryUserRoleQuery.select>;

export type TGetChannelQueryBuilder = Pick<
  Channel,
  | "id"
  | "platformId"
  | "channelArn"
  | "type"
  | "status"
  | "appointmentId"
  | "appointmentsGroupId"
  | "appointmentPlatformId"
  | "operatedByCompanyId"
  | "resolvedDate"
  | "creationDate"
  | "updatingDate"
> & {
  channelMemberships: Pick<ChannelMembership, "id" | "instanceUserArn" | "type" | "unreadMessagesCount"> & {
    userRole: Pick<UserRole, "id"> & {
      profile: Pick<UserProfile, "id" | "firstName" | "preferredName">;
      user: Pick<User, "id" | "platformId" | "avatarUrl">;
      role: Pick<Role, "id" | "name">;
    };
  };
};

export const GetChannelByIdQuery = {
  select: {
    id: true,
    platformId: true,
    channelArn: true,
    type: true,
    status: true,
    appointmentId: true,
    appointmentsGroupId: true,
    appointmentPlatformId: true,
    operatedByCompanyId: true,
    resolvedDate: true,
    creationDate: true,
    updatingDate: true,
    channelMemberships: {
      id: true,
      instanceUserArn: true,
      type: true,
      unreadMessagesCount: true,
      userRole: {
        id: true,
        profile: {
          id: true,
          firstName: true,
          preferredName: true,
        },
        user: {
          id: true,
          platformId: true,
          avatarUrl: true,
        },
        role: {
          id: true,
          name: true,
        },
      },
    },
  } as const satisfies FindOptionsSelect<Channel>,
  relations: {
    channelMemberships: { userRole: { user: true, profile: true, role: true } },
  } as const satisfies FindOptionsRelations<Channel>,
};
export type TGetChannelById = QueryResultType<Channel, typeof GetChannelByIdQuery.select>;

export const GetChannelAppointmentInformationQuery = {
  select: { id: true, appointmentsGroupId: true, appointmentId: true } as const satisfies FindOptionsSelect<Channel>,
};
export type TGetChannelAppointmentInformation = QueryResultType<
  Channel,
  typeof GetChannelAppointmentInformationQuery.select
>;

export const GetExistingChannelQuery = {
  select: {
    id: true,
    platformId: true,
    channelArn: true,
    type: true,
    status: true,
    appointmentId: true,
    appointmentsGroupId: true,
    appointmentPlatformId: true,
    operatedByCompanyId: true,
    resolvedDate: true,
    creationDate: true,
    updatingDate: true,
  } as const satisfies FindOptionsSelect<Channel>,
};
export type TGetExistingChannel = QueryResultType<Channel, typeof GetExistingChannelQuery.select>;

export const GetChannelAppointmentQuery = {
  select: {
    id: true,
    scheduledStartTime: true,
    scheduledEndTime: true,
    communicationType: true,
    schedulingType: true,
    interpretingType: true,
    platformId: true,
    status: true,
    archivedByClient: true,
    languageFrom: true,
    languageTo: true,
    appointmentsGroupId: true,
    clientId: true,
    channelId: true,
  } as const satisfies FindOptionsSelect<Appointment>,
};
export type TGetChannelAppointment = QueryResultType<Appointment, typeof GetChannelAppointmentQuery.select>;
