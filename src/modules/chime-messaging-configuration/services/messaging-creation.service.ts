import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Channel, ChannelMembership } from "src/modules/chime-messaging-configuration/entities";
import { AwsMessagingSdkService } from "src/modules/aws/messaging-sdk/aws-messaging-sdk.service";
import { CreateChannelDto } from "src/modules/chime-messaging-configuration/common/dto";
import { UserRole } from "src/modules/users/entities";
import {
  EChannelMembershipType,
  EChannelStatus,
  EChannelType,
} from "src/modules/chime-messaging-configuration/common/enums";
import { ADMIN_ROLES, COMPANY_ADMIN_ROLES, UNDEFINED_VALUE } from "src/common/constants";
import {
  ICreateChannelConfig,
  ICreateChannelMembershipConfig,
} from "src/modules/chime-messaging-configuration/common/interfaces";
import {
  MessagingIdentityService,
  MessagingQueryOptionsService,
  MessagingQueryService,
} from "src/modules/chime-messaging-configuration/services";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import {
  TConstructAndCreateChannelMembership,
  TConstructAndCreateChannelMembershipUserRole,
  TConstructAndCreateChannelUserRole,
  TCreateAppointmentChannelAppointment,
  TGetChannelAppointment,
  TGetExistingChannel,
  TMessagingCreationUserRole,
} from "src/modules/chime-messaging-configuration/common/types";
import { findManyTyped, findOneOrFailTyped, isInRoles } from "src/common/utils";
import { Appointment } from "src/modules/appointments/appointment/entities";

@Injectable()
export class MessagingCreationService {
  constructor(
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,
    @InjectRepository(ChannelMembership)
    private readonly channelMembershipRepository: Repository<ChannelMembership>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @Inject(forwardRef(() => MessagingQueryService))
    private readonly messagingQueryService: MessagingQueryService,
    private readonly messagingQueryOptionsService: MessagingQueryOptionsService,
    private readonly messagingIdentityService: MessagingIdentityService,
    private readonly awsMessagingSdkService: AwsMessagingSdkService,
  ) {}

  public async createChannel(user: ITokenUserData, dto: CreateChannelDto): Promise<TGetExistingChannel | Channel> {
    if (!isInRoles(ADMIN_ROLES, user.role) && dto.recipientId) {
      throw new ForbiddenException("Forbidden request.");
    }

    const existingChannel = await this.messagingQueryService.getExistingChannelForUser(user.userRoleId, dto);

    if (existingChannel) {
      return existingChannel;
    }

    let channel: Channel;

    if (isInRoles(ADMIN_ROLES, user.role) && dto.recipientId) {
      channel = await this.createChannelByAdmin(user, dto);
    } else {
      channel = await this.createChannelByUser(user, dto);
    }

    return channel;
  }

  private async createChannelByAdmin(user: ITokenUserData, dto: CreateChannelDto): Promise<Channel> {
    if (!dto.recipientId) {
      throw new BadRequestException("recipientId should not be empty.");
    }

    if (dto.recipientId === user.userRoleId) {
      throw new BadRequestException("Admin and recipient cannot be the same.");
    }

    const queryOptions = this.messagingQueryOptionsService.createChannelByAdminOptions(
      user.userRoleId,
      dto.recipientId,
    );

    const adminUserRole = await findOneOrFailTyped<TMessagingCreationUserRole>(
      user.userRoleId,
      this.userRoleRepository,
      queryOptions.adminUserRole,
    );
    const recipientUserRole = await findOneOrFailTyped<TMessagingCreationUserRole>(
      dto.recipientId,
      this.userRoleRepository,
      queryOptions.recipientUserRole,
    );

    if (!adminUserRole.profile || !recipientUserRole.profile) {
      throw new BadRequestException("Admin or recipient has not completed their profile.");
    }

    const channel = await this.constructAndCreateChannel(adminUserRole);

    await this.constructAndCreateChannelMembership(channel, adminUserRole, EChannelMembershipType.MODERATOR);
    await this.constructAndCreateChannelMembership(channel, recipientUserRole);

    return channel;
  }

  private async createChannelByUser(user: ITokenUserData, dto: CreateChannelDto): Promise<Channel> {
    const queryOptions = this.messagingQueryOptionsService.createChannelByUserOptions(user.userRoleId);
    const appointmentsQueryOptions = this.messagingQueryOptionsService.getChannelAppointmentsOptions(
      dto.appointmentId,
      dto.appointmentsGroupId,
    );

    const userRole = await findOneOrFailTyped<TMessagingCreationUserRole>(
      user.userRoleId,
      this.userRoleRepository,
      queryOptions,
    );

    if (!userRole.profile) {
      throw new BadRequestException("User has not completed their profile.");
    }

    let appointment: TGetChannelAppointment | null = null;

    if (dto.appointmentId) {
      appointment = await findOneOrFailTyped<TGetChannelAppointment>(
        dto.appointmentId,
        this.appointmentRepository,
        appointmentsQueryOptions.appointment,
      );
    } else if (dto.appointmentsGroupId) {
      const appointments = await findManyTyped<TGetChannelAppointment[]>(
        this.appointmentRepository,
        appointmentsQueryOptions.appointments,
      );
      appointment = appointments[0];
    }

    const channel = await this.constructAndCreateChannel(
      userRole,
      appointment?.id,
      appointment?.platformId,
      appointment?.appointmentsGroupId ?? UNDEFINED_VALUE,
      EChannelType.SUPPORT,
    );

    await this.constructAndCreateChannelMembership(channel, userRole);

    return channel;
  }

  public async createAppointmentChannel(
    appointment: TCreateAppointmentChannelAppointment,
    interpreter: UserRole,
  ): Promise<void> {
    const existingChannel = await this.messagingQueryService.getExistingAppointmentChannel(appointment, interpreter);

    if (existingChannel) {
      await this.appointmentRepository.update(appointment.id, {
        channelId: existingChannel.id,
      });

      return;
    }

    if (appointment.client && interpreter) {
      const channel = await this.constructAndCreateChannel(
        appointment.client,
        appointment.id,
        appointment.platformId,
        appointment.appointmentsGroupId ?? UNDEFINED_VALUE,
      );

      await this.appointmentRepository.update(appointment.id, {
        channelId: channel.id,
      });

      await this.constructAndCreateChannelMembership(channel, appointment.client);
      await this.constructAndCreateChannelMembership(channel, interpreter);
    }
  }

  private async constructAndCreateChannel(
    initiatorUserRole: TConstructAndCreateChannelUserRole,
    appointmentId?: string,
    appointmentPlatformId?: string,
    appointmentGroupId?: string,
    type: EChannelType = EChannelType.PRIVATE,
  ): Promise<Channel> {
    const { appInstanceArn, adminArn } = await this.messagingIdentityService.getConfig();

    const createChannelConfig = await this.constructChannelConfigurationDto(
      initiatorUserRole,
      type,
      appointmentId,
      appointmentPlatformId,
      appointmentGroupId,
    );
    const channel = await this.createChannelConfiguration(createChannelConfig);
    const createChannelCommand = await this.awsMessagingSdkService.createChannel(appInstanceArn, adminArn, channel);

    if (createChannelCommand.ChannelArn) {
      await this.channelRepository.update(channel.id, {
        channelArn: createChannelCommand.ChannelArn,
      });

      channel.channelArn = createChannelCommand.ChannelArn;
    }

    return channel;
  }

  private async createChannelConfiguration(dto: ICreateChannelConfig): Promise<Channel> {
    const newChannelConfiguration = this.channelRepository.create(dto);
    const savedChannelConfiguration = await this.channelRepository.save(newChannelConfiguration);

    return savedChannelConfiguration;
  }

  private async constructChannelConfigurationDto(
    initiatorUserRole: TConstructAndCreateChannelUserRole,
    type: EChannelType,
    appointmentId?: string,
    appointmentPlatformId?: string,
    appointmentsGroupId?: string,
  ): Promise<ICreateChannelConfig> {
    const determinedAppointmentId = appointmentsGroupId ? null : appointmentId;
    const determinedAppointmentPlatformId = appointmentsGroupId ? null : appointmentPlatformId;
    let determinedOperatedByCompanyId = initiatorUserRole.operatedByCompanyId;

    if (isInRoles(COMPANY_ADMIN_ROLES, initiatorUserRole.role.name) && type === EChannelType.SUPPORT) {
      if (initiatorUserRole.operatedByMainCorporateCompanyId) {
        determinedOperatedByCompanyId = initiatorUserRole.operatedByMainCorporateCompanyId;
      }
    }

    return {
      type,
      status: EChannelStatus.INITIALIZED,
      appointmentsGroupId,
      appointmentId: determinedAppointmentId,
      appointmentPlatformId: determinedAppointmentPlatformId,
      operatedByCompanyId: determinedOperatedByCompanyId,
    };
  }

  public async constructAndCreateChannelMembership(
    channel: TConstructAndCreateChannelMembership,
    userRole: TConstructAndCreateChannelMembershipUserRole,
    type: EChannelMembershipType = EChannelMembershipType.MEMBER,
  ): Promise<void> {
    if (!userRole.instanceUserArn) {
      throw new NotFoundException("User instance ARN not found.");
    }

    const { adminArn } = await this.messagingIdentityService.getConfig();

    const createChannelMembershipConfig = await this.constructChannelMembershipConfigurationDto(
      channel,
      userRole,
      type,
    );
    await this.createChannelMembershipConfiguration(createChannelMembershipConfig);

    if (channel.channelArn) {
      await this.awsMessagingSdkService.createChannelMembership(channel.channelArn, userRole.instanceUserArn, adminArn);
    }
  }

  private async createChannelMembershipConfiguration(dto: ICreateChannelMembershipConfig): Promise<void> {
    const newChannelMembershipConfiguration = this.channelMembershipRepository.create(dto);
    await this.channelMembershipRepository.save(newChannelMembershipConfiguration);
  }

  private async constructChannelMembershipConfigurationDto(
    channel: TConstructAndCreateChannelMembership,
    userRole: TConstructAndCreateChannelMembershipUserRole,
    type: EChannelMembershipType,
  ): Promise<ICreateChannelMembershipConfig> {
    return {
      instanceUserArn: userRole.instanceUserArn,
      channel: channel as Channel,
      userRole: userRole as UserRole,
      type,
    };
  }
}
