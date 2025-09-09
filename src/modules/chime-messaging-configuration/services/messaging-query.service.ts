import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Channel } from "src/modules/chime-messaging-configuration/entities";
import { AwsMessagingSdkService } from "src/modules/aws/messaging-sdk/aws-messaging-sdk.service";
import {
  CreateChannelDto,
  GetAdminChannelsDto,
  GetAppointmentChannels,
  GetChannelMessagesDto,
  GetUserChannelsDto,
} from "src/modules/chime-messaging-configuration/common/dto";
import { EChannelStatus, EChannelType } from "src/modules/chime-messaging-configuration/common/enums";
import {
  GetAdminChannelsOutput,
  GetChannelMessagesOutput,
  GetUserChannelsOutput,
  IGetAllChannelsWebSocketOutput,
} from "src/modules/chime-messaging-configuration/common/outputs";
import {
  MessagingIdentityService,
  MessagingManagementService,
  MessagingQueryOptionsService,
} from "src/modules/chime-messaging-configuration/services";
import { UserRole } from "src/modules/users/entities";
import { EUserRoleName } from "src/modules/users/common/enums";
import { ActiveChannelStorageService } from "src/modules/web-socket-gateway/common/storages";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { LokiLogger } from "src/common/logger";
import {
  findManyAndCountQueryBuilderTyped,
  findManyQueryBuilderTyped,
  findManyTyped,
  findOneOrFailTyped,
  findOneTyped,
} from "src/common/utils";
import {
  MessagingQueryUserRoleQuery,
  TCreateAppointmentChannelAppointment,
  TGetChannelQueryBuilder,
  TGetChannelAppointmentInformation,
  TGetChannelById,
  TMessagingQueryUserRole,
  TGetExistingChannel,
  TGetChannelAppointment,
} from "src/modules/chime-messaging-configuration/common/types";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { UNDEFINED_VALUE } from "src/common/constants";

@Injectable()
export class MessagingQueryService {
  private readonly lokiLogger = new LokiLogger(MessagingQueryService.name);
  constructor(
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    private readonly messagingManagementService: MessagingManagementService,
    private readonly messagingIdentityService: MessagingIdentityService,
    private readonly messagingQueryOptionsService: MessagingQueryOptionsService,
    private readonly awsMessagingSdkService: AwsMessagingSdkService,
    private readonly activeChannelStorageService: ActiveChannelStorageService,
  ) {}

  public async getChannelMessages(dto: GetChannelMessagesDto, user: ITokenUserData): Promise<GetChannelMessagesOutput> {
    const { adminArn } = await this.messagingIdentityService.getConfig();
    const { ChannelMessages = [], NextToken = null } = await this.awsMessagingSdkService.listChannelMessages(
      dto.channelArn,
      adminArn,
      dto.nextToken,
    );

    this.activeChannelStorageService.setActiveChannel(user.userRoleId, dto.channelArn).catch((error: Error) => {
      this.lokiLogger.error(`Failed to set active channel for userRoleId: ${user.userRoleId}`, error.stack);
    });
    this.messagingManagementService.resetUnreadCounterByUser(dto.channelArn, user.userRoleId).catch((error: Error) => {
      this.lokiLogger.error(`Failed to reset unread counter for userRoleId: ${user.userRoleId}`, error.stack);
    });

    return {
      messages: ChannelMessages,
      nextToken: NextToken,
    };
  }

  public async getAdminChannelsByType(dto: GetAdminChannelsDto, user: ITokenUserData): Promise<GetAdminChannelsOutput> {
    const queryBuilder = this.channelRepository.createQueryBuilder("channel");
    const adminUserRole = await findOneOrFailTyped<TMessagingQueryUserRole>(user.userRoleId, this.userRoleRepository, {
      select: MessagingQueryUserRoleQuery.select,
      where: { id: user.userRoleId },
      relations: MessagingQueryUserRoleQuery.relations,
    });

    this.messagingQueryOptionsService.getAdminChannelsByTypeOptions(queryBuilder, dto, adminUserRole);

    const [channels, count] = await findManyAndCountQueryBuilderTyped<TGetChannelQueryBuilder[]>(queryBuilder);

    return {
      data: channels,
      total: count,
      limit: dto.limit,
      offset: dto.offset,
    };
  }

  public async getAppointmentChannels(dto: GetAppointmentChannels): Promise<GetAdminChannelsOutput> {
    const CHANNEL_TYPE = EChannelType.PRIVATE;

    const queryBuilder = this.channelRepository.createQueryBuilder("channel");
    this.messagingQueryOptionsService.getAppointmentChannelsOptions(queryBuilder, dto, CHANNEL_TYPE);

    const [channels, count] = await findManyAndCountQueryBuilderTyped<TGetChannelQueryBuilder[]>(queryBuilder);

    return {
      data: channels,
      total: count,
      limit: dto.limit,
      offset: dto.offset,
    };
  }

  public async getUserChannelsByType(dto: GetUserChannelsDto, user: ITokenUserData): Promise<GetUserChannelsOutput> {
    const queryBuilder = this.channelRepository.createQueryBuilder("channel");
    this.messagingQueryOptionsService.getUserChannelsByTypeOptions(queryBuilder, dto, user.userRoleId);

    const channels = await findManyQueryBuilderTyped<TGetChannelQueryBuilder[]>(queryBuilder);

    const nextCursor = channels.length === dto.limit ? channels[channels.length - 1].updatingDate : null;

    return {
      data: channels,
      nextCursor,
    };
  }

  public async getChannelById(id: string): Promise<TGetChannelById> {
    const queryOptions = this.messagingQueryOptionsService.getChannelByIdOptions(id);
    const channel = await findOneOrFailTyped<TGetChannelById>(id, this.channelRepository, queryOptions);

    return channel;
  }

  public async getChannelAppointmentInformation(
    id: string,
  ): Promise<TGetChannelAppointment | TGetChannelAppointment[]> {
    const queryOptions = this.messagingQueryOptionsService.getChannelAppointmentInformationOptions(id);
    const channel = await findOneOrFailTyped<TGetChannelAppointmentInformation>(
      id,
      this.channelRepository,
      queryOptions,
    );

    const appointmentsQueryOptions = this.messagingQueryOptionsService.getChannelAppointmentsOptions(
      channel.appointmentId ?? UNDEFINED_VALUE,
      channel.appointmentsGroupId ?? UNDEFINED_VALUE,
    );

    if (channel.appointmentsGroupId) {
      const appointments = await findManyTyped<TGetChannelAppointment[]>(
        this.appointmentRepository,
        appointmentsQueryOptions.appointments,
      );

      return appointments;
    }

    if (channel.appointmentId) {
      const appointment = await findOneOrFailTyped<TGetChannelAppointment>(
        channel.appointmentId,
        this.appointmentRepository,
        appointmentsQueryOptions.appointment,
      );

      return appointment;
    }

    throw new NotFoundException("No appointment information found for the channel.");
  }

  public async getExistingChannelForUser(
    userRoleId: string,
    dto: CreateChannelDto,
  ): Promise<TGetExistingChannel | null> {
    const queryOptions = this.messagingQueryOptionsService.getExistingChannelForUserOptions(userRoleId, dto);
    const existingChannel = await findOneTyped<TGetExistingChannel>(this.channelRepository, queryOptions);

    return existingChannel ?? null;
  }

  public async getExistingAppointmentChannel(
    appointment: TCreateAppointmentChannelAppointment,
    interpreter: UserRole,
  ): Promise<TGetExistingChannel | null> {
    const queryOptions = this.messagingQueryOptionsService.getExistingAppointmentChannelOptions(
      appointment,
      interpreter,
    );
    const existingChannel = await findOneTyped<TGetExistingChannel>(this.channelRepository, queryOptions);

    if (existingChannel && existingChannel.status === EChannelStatus.RESOLVED) {
      await this.channelRepository.update(existingChannel.id, {
        status: EChannelStatus.INITIALIZED,
        resolvedDate: null,
      });
    }

    return existingChannel ?? null;
  }

  public async getNewChannelsForWebSocket(
    userRoleId: string,
    userRole: EUserRoleName,
    operatedByCompanyId: string,
    lastChecked: Date,
  ): Promise<IGetAllChannelsWebSocketOutput> {
    const privateChannelsQueryBuilder = this.channelRepository.createQueryBuilder("channel");
    this.messagingQueryOptionsService.getNewPrivateChannelsForWebSocketOptions(
      privateChannelsQueryBuilder,
      lastChecked,
      userRoleId,
    );

    const supportChannelsQueryBuilder = this.channelRepository.createQueryBuilder("channel");
    this.messagingQueryOptionsService.getNewSupportChannelsForWebSocketOptions(
      supportChannelsQueryBuilder,
      lastChecked,
      userRoleId,
      operatedByCompanyId,
      userRole,
    );

    const allPrivateChannels = await findManyQueryBuilderTyped<TGetChannelQueryBuilder[]>(privateChannelsQueryBuilder);
    const allSupportChannels = await findManyQueryBuilderTyped<TGetChannelQueryBuilder[]>(supportChannelsQueryBuilder);

    return {
      privateChannels: [...allPrivateChannels],
      supportChannels: [...allSupportChannels],
    };
  }

  public async isInterpreterUnassignedFromGroupAppointments(
    userRoleId: string,
    appointmentsGroupId: string,
  ): Promise<boolean> {
    const queryBuilder = this.appointmentRepository.createQueryBuilder("appointment");
    this.messagingQueryOptionsService.isInterpreterUnassignedFromGroupAppointmentsOptions(
      queryBuilder,
      appointmentsGroupId,
      userRoleId,
    );

    const result = await queryBuilder.getCount();

    return result === 0;
  }
}
