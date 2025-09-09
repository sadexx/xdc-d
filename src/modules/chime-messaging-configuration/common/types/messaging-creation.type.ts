import { FindOptionsRelations, FindOptionsSelect } from "typeorm";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { Role } from "src/modules/users/entities";
import { UserRole } from "src/modules/users/entities";
import { QueryResultType } from "src/common/types";
import { Channel } from "src/modules/chime-messaging-configuration/entities";

/**
 ** Type
 */

export type TConstructAndCreateChannelUserRole = Pick<
  UserRole,
  "id" | "instanceUserArn" | "operatedByCompanyId" | "operatedByMainCorporateCompanyId"
> & {
  role: Pick<Role, "id" | "name">;
};

export type TCreateAppointmentChannelAppointment = Pick<Appointment, "id" | "appointmentsGroupId" | "platformId"> & {
  client: TConstructAndCreateChannelUserRole;
};

export type TConstructAndCreateChannelMembership = Pick<Channel, "id" | "channelArn">;

export type TConstructAndCreateChannelMembershipUserRole = Pick<UserRole, "id" | "instanceUserArn"> & {
  role: Pick<Role, "id" | "name">;
};

/**
 ** Query types
 */

export const MessagingCreationUserRoleQuery = {
  select: {
    id: true,
    instanceUserArn: true,
    operatedByCompanyId: true,
    operatedByMainCorporateCompanyId: true,
    profile: {
      id: true,
    },
    role: {
      id: true,
      name: true,
    },
  } as const satisfies FindOptionsSelect<UserRole>,
  relations: { profile: true, role: true } as const satisfies FindOptionsRelations<UserRole>,
};
export type TMessagingCreationUserRole = QueryResultType<UserRole, typeof MessagingCreationUserRoleQuery.select>;
