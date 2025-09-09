import { Injectable } from "@nestjs/common";
import { Brackets, FindManyOptions, FindOneOptions, In, IsNull, LessThan, Not, SelectQueryBuilder } from "typeorm";
import {
  EChannelType,
  EChannelStatus,
  EChannelMembershipType,
} from "src/modules/chime-messaging-configuration/common/enums";
import { Channel } from "src/modules/chime-messaging-configuration/entities";
import {
  CreateChannelDto,
  GetAdminChannelsDto,
  GetAppointmentChannels,
  GetUserChannelsDto,
} from "src/modules/chime-messaging-configuration/common/dto";
import { ESortOrder } from "src/common/enums";
import { ADMIN_ROLES, COMPANY_ADMIN_ROLES, INTERPRETER_AND_CLIENT_ROLES } from "src/common/constants";
import { UserRole } from "src/modules/users/entities";
import { EUserRoleName } from "src/modules/users/common/enums";
import {
  ClassifyChannelsForResolutionQuery,
  DeleteOldChannelsQuery,
  GetChannelAppointmentInformationQuery,
  GetChannelAppointmentQuery,
  GetChannelByIdQuery,
  GetExistingChannelQuery,
  JoinChannelQuery,
  JoinChannelUserRoleQuery,
  MessagingCreationUserRoleQuery,
  ResolveChannelQuery,
  ResolveChannelUserRoleQuery,
  TCreateAppointmentChannelAppointment,
  TMessagingQueryUserRole,
  UploadFileQuery,
} from "src/modules/chime-messaging-configuration/common/types";
import { isInRoles } from "src/common/utils";
import { Appointment } from "src/modules/appointments/appointment/entities";

@Injectable()
export class MessagingQueryOptionsService {
  /**
   ** MessagingQueryService
   */

  public getAdminChannelsByTypeOptions(
    queryBuilder: SelectQueryBuilder<Channel>,
    dto: GetAdminChannelsDto,
    adminUserRole: TMessagingQueryUserRole,
  ): void {
    this.buildBaseChannelQuery(queryBuilder, dto.type);

    if (dto.type === EChannelType.PRIVATE) {
      queryBuilder.innerJoin(
        "channel.channelMemberships",
        "channelMembership",
        "channelMembership.userRole = :userRoleId",
        { userRoleId: adminUserRole.id },
      );
    }

    if (isInRoles(COMPANY_ADMIN_ROLES, adminUserRole.role.name) && dto.type === EChannelType.SUPPORT) {
      queryBuilder
        .leftJoin("channel.channelMemberships", "channelMembership", "channelMembership.userRole = :userRoleId", {
          userRoleId: adminUserRole.id,
        })
        .andWhere("(channel.operatedByCompanyId = :operatedByCompanyId OR channelMembership.id IS NOT NULL)", {
          operatedByCompanyId: adminUserRole.operatedByCompanyId,
        });
    }

    if (dto.searchField) {
      this.applySearch(queryBuilder, dto.searchField);
    }

    queryBuilder.orderBy("channel.updatingDate", ESortOrder.DESC);
    queryBuilder.skip(dto.offset);
    queryBuilder.take(dto.limit);
  }

  public getAppointmentChannelsOptions(
    queryBuilder: SelectQueryBuilder<Channel>,
    dto: GetAppointmentChannels,
    channelType: EChannelType,
  ): void {
    this.buildBaseChannelQuery(queryBuilder, channelType);
    queryBuilder
      .andWhere(
        `channel.id IN (
					SELECT channel_memberships.channel_id
					FROM channel_memberships
					JOIN user_roles ON user_roles.id = channel_memberships.user_role_id
					JOIN roles ON roles.id = user_roles.role_id
					WHERE roles.role IN (:...roles)
					GROUP BY channel_memberships.channel_id
					HAVING COUNT(DISTINCT roles.role) = 2)`,
        { roles: INTERPRETER_AND_CLIENT_ROLES },
      )
      .andWhere("(channel.appointmentId IS NOT NULL OR channel.appointmentsGroupId IS NOT NULL)");

    if (dto.searchField) {
      this.applySearch(queryBuilder, dto.searchField);
    }

    queryBuilder.orderBy("channel.updatingDate", ESortOrder.DESC).skip(dto.offset).take(dto.limit);
  }

  public getUserChannelsByTypeOptions(
    queryBuilder: SelectQueryBuilder<Channel>,
    dto: GetUserChannelsDto,
    userRoleId: string,
  ): void {
    this.buildBaseChannelQuery(queryBuilder, dto.type);
    queryBuilder.innerJoin(
      "channel.channelMemberships",
      "channelMembership",
      "channelMembership.userRole = :userRoleId",
      { userRoleId },
    );

    if (dto.cursor) {
      queryBuilder.andWhere("channel.updatingDate < :cursor", { cursor: dto.cursor });
    }

    if (dto.searchField) {
      this.applySearch(queryBuilder, dto.searchField);
    }

    queryBuilder.orderBy("channel.updatingDate", ESortOrder.DESC).take(dto.limit);
  }

  private applySearch(queryBuilder: SelectQueryBuilder<Channel>, searchField: string): void {
    const searchTerm = `%${searchField}%`;
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.where("channel.platformId ILIKE :search", { search: searchTerm })
          .orWhere("channel.appointmentPlatformId ILIKE :search", { search: searchTerm })
          .orWhere("channel.appointmentsGroupId ILIKE :search", { search: searchTerm })
          .orWhere("user.platformId ILIKE :search", { search: searchTerm })
          .orWhere("profile.preferredName ILIKE :search", { search: searchTerm })
          .orWhere("profile.firstName ILIKE :search", { search: searchTerm })
          .orWhere("CAST(role.name AS TEXT) ILIKE :search", { search: searchTerm });
      }),
    );
  }

  public getNewPrivateChannelsForWebSocketOptions(
    queryBuilder: SelectQueryBuilder<Channel>,
    lastChecked: Date,
    userRoleId: string,
  ): void {
    this.buildBaseChannelQuery(queryBuilder, EChannelType.PRIVATE);
    queryBuilder
      .andWhere("channel.updatingDate > :lastChecked", { lastChecked })
      .innerJoin("channel.channelMemberships", "channelMembership", "channelMembership.userRole = :userRoleId", {
        userRoleId,
      });
  }

  public getNewSupportChannelsForWebSocketOptions(
    queryBuilder: SelectQueryBuilder<Channel>,
    lastChecked: Date,
    userRoleId: string,
    operatedByCompanyId: string,
    userRole: EUserRoleName,
  ): void {
    this.buildBaseChannelQuery(queryBuilder, EChannelType.SUPPORT);
    queryBuilder.andWhere("channel.updatingDate > :lastChecked", { lastChecked });

    if (isInRoles(COMPANY_ADMIN_ROLES, userRole)) {
      queryBuilder
        .leftJoin("channel.channelMemberships", "channelMembership", "channelMembership.userRole = :userRoleId", {
          userRoleId: userRoleId,
        })
        .andWhere("(channel.operatedByCompanyId = :operatedByCompanyId OR channelMembership.id IS NOT NULL)", {
          operatedByCompanyId: operatedByCompanyId,
        });
    }

    if (!isInRoles(ADMIN_ROLES, userRole)) {
      queryBuilder.innerJoin(
        "channel.channelMemberships",
        "channelMembership",
        "channelMembership.userRole = :userRoleId",
        { userRoleId },
      );
    }
  }

  private buildBaseChannelQuery(queryBuilder: SelectQueryBuilder<Channel>, type: EChannelType): void {
    queryBuilder
      .select([
        "channel.id",
        "channel.platformId",
        "channel.channelArn",
        "channel.type",
        "channel.status",
        "channel.appointmentId",
        "channel.appointmentsGroupId",
        "channel.appointmentPlatformId",
        "channel.operatedByCompanyId",
        "channel.resolvedDate",
        "channel.creationDate",
        "channel.updatingDate",
      ])
      .leftJoin("channel.channelMemberships", "channelMemberships")
      .addSelect([
        "channelMemberships.id",
        "channelMemberships.instanceUserArn",
        "channelMemberships.type",
        "channelMemberships.unreadMessagesCount",
      ])
      .leftJoin("channelMemberships.userRole", "userRole")
      .addSelect(["userRole.id"])
      .leftJoin("userRole.user", "user")
      .addSelect(["user.id", "user.platformId", "user.avatarUrl"])
      .leftJoin("userRole.profile", "profile")
      .addSelect(["profile.id", "profile.preferredName", "profile.firstName"])
      .leftJoin("userRole.role", "role")
      .addSelect(["role.id", "role.name"])
      .where("channel.type = :type", { type })
      .andWhere("channel.status != :status", { status: EChannelStatus.INITIALIZED });
  }

  public getChannelByIdOptions(id: string): FindOneOptions<Channel> {
    return {
      select: GetChannelByIdQuery.select,
      where: { id },
      relations: GetChannelByIdQuery.relations,
    };
  }

  public getChannelAppointmentInformationOptions(id: string): FindOneOptions<Channel> {
    return {
      where: { id },
      select: GetChannelAppointmentInformationQuery.select,
    };
  }

  public getExistingChannelForUserOptions(userRoleId: string, dto: CreateChannelDto): FindOneOptions<Channel> {
    return {
      select: GetExistingChannelQuery.select,
      where: {
        type: dto.recipientId ? EChannelType.PRIVATE : EChannelType.SUPPORT,
        channelMemberships: { userRole: { id: userRoleId }, type: EChannelMembershipType.MEMBER },
        status: Not(EChannelStatus.RESOLVED),
        appointmentId: dto.appointmentId ?? IsNull(),
        appointmentsGroupId: dto.appointmentsGroupId ?? IsNull(),
        ...(dto.recipientId && { channelMemberships: { userRole: { id: dto.recipientId } } }),
      },
    };
  }

  public getExistingAppointmentChannelOptions(
    appointment: TCreateAppointmentChannelAppointment,
    interpreter: UserRole,
  ): FindOneOptions<Channel> {
    if (appointment.appointmentsGroupId) {
      return {
        select: GetExistingChannelQuery.select,
        where: {
          appointmentsGroupId: appointment.appointmentsGroupId,
          channelMemberships: {
            userRole: { id: interpreter.id },
          },
        },
      };
    } else {
      return {
        select: GetExistingChannelQuery.select,
        where: {
          appointmentId: appointment.id,
          channelMemberships: {
            userRole: { id: interpreter.id },
          },
        },
      };
    }
  }

  public isInterpreterUnassignedFromGroupAppointmentsOptions(
    queryBuilder: SelectQueryBuilder<Appointment>,
    appointmentsGroupId: string,
    userRoleId: string,
  ): void {
    queryBuilder
      .where("appointment.appointmentsGroupId = :appointmentsGroupId", { appointmentsGroupId })
      .andWhere("appointment.interpreter_id = :userRoleId", { userRoleId });
  }

  public getChannelAppointmentsOptions(
    appointmentId?: string,
    appointmentsGroupId?: string,
  ): {
    appointment: FindOneOptions<Appointment>;
    appointments: FindManyOptions<Appointment>;
  } {
    return {
      appointment: {
        select: GetChannelAppointmentQuery.select,
        where: { id: appointmentId },
      },
      appointments: {
        select: GetChannelAppointmentQuery.select,
        where: { appointmentsGroupId: appointmentsGroupId },
      },
    };
  }

  /**
   ** MessagingCreationService
   */

  public createChannelByAdminOptions(
    adminUserRoleId: string,
    recipientUserRoleId: string,
  ): { adminUserRole: FindOneOptions<UserRole>; recipientUserRole: FindOneOptions<UserRole> } {
    return {
      adminUserRole: {
        select: MessagingCreationUserRoleQuery.select,
        where: { id: adminUserRoleId },
        relations: MessagingCreationUserRoleQuery.relations,
      },
      recipientUserRole: {
        select: MessagingCreationUserRoleQuery.select,
        where: { id: recipientUserRoleId },
        relations: MessagingCreationUserRoleQuery.relations,
      },
    };
  }

  public createChannelByUserOptions(userRoleId: string): FindOneOptions<UserRole> {
    return {
      select: MessagingCreationUserRoleQuery.select,
      where: { id: userRoleId },
      relations: MessagingCreationUserRoleQuery.relations,
    };
  }

  /**
   ** MessagingManagementService
   */

  public joinChannelOptions(
    id: string,
    userRoleId: string,
  ): { channel: FindOneOptions<Channel>; userRole: FindOneOptions<UserRole> } {
    return {
      channel: {
        select: JoinChannelQuery.select,
        where: { id },
        relations: JoinChannelQuery.relations,
      },
      userRole: {
        select: JoinChannelUserRoleQuery.select,
        where: { id: userRoleId },
        relations: JoinChannelUserRoleQuery.relations,
      },
    };
  }

  public uploadFileOptions(id: string): FindOneOptions<Channel> {
    return {
      select: UploadFileQuery.select,
      where: { id },
    };
  }

  public deleteOldChannelsOptions(threeWeeksAgo: Date): FindManyOptions<Channel> {
    return {
      select: DeleteOldChannelsQuery.select,
      where: [
        { status: EChannelStatus.RESOLVED, resolvedDate: LessThan(threeWeeksAgo) },
        { status: EChannelStatus.INITIALIZED, creationDate: LessThan(threeWeeksAgo) },
      ],
    };
  }

  /**
   ** MessagingResolveService
   */

  public resolveChannelOptions(
    id: string,
    userRoleId: string,
  ): { channel: FindOneOptions<Channel>; userRole: FindOneOptions<UserRole> } {
    return {
      channel: { select: ResolveChannelQuery.select, where: { id } },
      userRole: {
        select: ResolveChannelUserRoleQuery.select,
        where: { id: userRoleId },
      },
    };
  }

  public resolveSingleChannelAppointmentOptions(id: string): FindOneOptions<Channel> {
    return {
      select: ResolveChannelQuery.select,
      where: { id },
    };
  }

  public classifyChannelsForResolutionOptions(channelIds: string[]): FindManyOptions<Appointment> {
    return {
      select: ClassifyChannelsForResolutionQuery.select,
      where: { channelId: In(channelIds) },
    };
  }
}
