import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { COMPLETED_APPOINTMENT_STATUSES } from "src/modules/appointments/shared/common/constants";
import { EAppointmentStatus } from "src/modules/appointments/appointment/common/enums";
import { EChannelStatus } from "src/modules/chime-messaging-configuration/common/enums";
import { Channel } from "src/modules/chime-messaging-configuration/entities";
import { findManyTyped, findOneOrFailTyped, findOneTyped } from "src/common/utils";
import {
  ResolveChannelForAppointmentGroupQuery,
  TClassifyChannelsForResolution,
  TGetChannelAppointment,
  TResolveChannel,
  TResolveChannelForAppointmentGroup,
  TResolveChannelUserRole,
  TResolveSingleAppointmentChannel,
} from "src/modules/chime-messaging-configuration/common/types";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { AccessControlService } from "src/modules/access-control/services";
import {
  MessagingQueryOptionsService,
  MessagingQueryService,
} from "src/modules/chime-messaging-configuration/services";
import { UserRole } from "src/modules/users/entities";
import { Appointment } from "src/modules/appointments/appointment/entities";

export class MessagingResolveService {
  constructor(
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    private readonly messagingQueryOptionsService: MessagingQueryOptionsService,
    private readonly messagingQueryService: MessagingQueryService,
    private readonly accessControlService: AccessControlService,
  ) {}

  public async resolveChannel(id: string, user: ITokenUserData): Promise<void> {
    const queryOptions = this.messagingQueryOptionsService.resolveChannelOptions(id, user.userRoleId);

    const channel = await findOneOrFailTyped<TResolveChannel>(id, this.channelRepository, queryOptions.channel);
    const userRole = await findOneOrFailTyped<TResolveChannelUserRole>(
      user.userRoleId,
      this.userRoleRepository,
      queryOptions.userRole,
    );

    this.accessControlService.validateSameCompanyAccess(userRole, channel);

    await this.resolveAppointmentChannel(channel);
  }

  public async handleChannelResolveProcess(appointmentId: string, interpreterId?: string): Promise<void> {
    const queryOptions = this.messagingQueryOptionsService.getChannelAppointmentsOptions(appointmentId);
    const appointment = await findOneTyped<TGetChannelAppointment>(
      this.appointmentRepository,
      queryOptions.appointment,
    );

    if (!appointment) {
      return;
    }

    if (interpreterId) {
      await this.resolveChannelByInterpreter(appointment, interpreterId);
    } else {
      await this.resolveChannelForGroupOrSingleAppointment(appointment);
    }
  }

  private async resolveChannelByInterpreter(appointment: TGetChannelAppointment, interpreterId: string): Promise<void> {
    const shouldResolve =
      !appointment.appointmentsGroupId ||
      (await this.messagingQueryService.isInterpreterUnassignedFromGroupAppointments(
        interpreterId,
        appointment.appointmentsGroupId,
      ));

    if (shouldResolve) {
      await this.resolveChannelForGroupOrSingleAppointment(appointment, interpreterId);
    }
  }

  private async resolveChannelForGroupOrSingleAppointment(
    appointment: TGetChannelAppointment,
    interpreterId?: string,
  ): Promise<void> {
    if (!appointment.appointmentsGroupId && appointment.channelId) {
      await this.resolveSingleAppointmentChannel(appointment as TResolveSingleAppointmentChannel);
    } else if (!appointment.appointmentsGroupId || !appointment.clientId) {
      await this.resolveChannelsForAppointmentGroup(appointment, interpreterId);
    }
  }

  private async resolveSingleAppointmentChannel(appointment: TResolveSingleAppointmentChannel): Promise<void> {
    const queryOptions = this.messagingQueryOptionsService.resolveSingleChannelAppointmentOptions(
      appointment.channelId,
    );
    const channel = await findOneTyped<TResolveChannel>(this.channelRepository, queryOptions);

    if (!channel) {
      return;
    }

    await this.resolveAppointmentChannel(channel);
  }

  private async resolveChannelsForAppointmentGroup(
    appointment: TGetChannelAppointment,
    interpreterId?: string,
  ): Promise<void> {
    const channels = await findManyTyped<TResolveChannelForAppointmentGroup[]>(this.channelRepository, {
      select: ResolveChannelForAppointmentGroupQuery.select,
      where: {
        appointmentsGroupId: appointment.appointmentsGroupId,
        channelMemberships: {
          userRole: { id: interpreterId ?? appointment.clientId },
        },
      },
    });

    const { channelIdsToResolve, channelsToRemove } = await this.classifyChannelsForResolution(channels);

    if (channelIdsToResolve.length > 0) {
      await this.channelRepository.update(
        { id: In(channelIdsToResolve) },
        { status: EChannelStatus.RESOLVED, resolvedDate: new Date() },
      );
    }

    if (channelsToRemove.length > 0) {
      await this.channelRepository.remove(channelsToRemove as Channel[]);
    }
  }

  private async resolveAppointmentChannel(channel: TResolveChannel): Promise<void> {
    if (channel.status === EChannelStatus.INITIALIZED) {
      await this.channelRepository.remove(channel as Channel);
    } else {
      await this.channelRepository.update(channel.id, {
        status: EChannelStatus.RESOLVED,
        resolvedDate: new Date(),
      });
    }
  }

  private async classifyChannelsForResolution(channels: TResolveChannelForAppointmentGroup[]): Promise<{
    channelIdsToResolve: string[];
    channelsToRemove: TResolveChannelForAppointmentGroup[];
  }> {
    const channelIds = channels.map((channel) => channel.id);
    const queryOptions = this.messagingQueryOptionsService.classifyChannelsForResolutionOptions(channelIds);
    const linkedAppointments = await findManyTyped<TClassifyChannelsForResolution[]>(
      this.appointmentRepository,
      queryOptions,
    );

    const channelIdsToResolve: string[] = [];
    const channelsToRemove: TResolveChannelForAppointmentGroup[] = [];

    for (const channel of channels) {
      const appointmentsByChannel = linkedAppointments.filter((appointment) => appointment.channelId === channel.id);
      const allLinkedAppointmentsCompleted = appointmentsByChannel.every((linkedAppointment) =>
        [...COMPLETED_APPOINTMENT_STATUSES, EAppointmentStatus.PENDING].includes(linkedAppointment.status),
      );

      if (allLinkedAppointmentsCompleted && channel.status === EChannelStatus.INITIALIZED) {
        channelsToRemove.push(channel);
      } else if (allLinkedAppointmentsCompleted) {
        channelIdsToResolve.push(channel.id);
      }
    }

    return {
      channelIdsToResolve,
      channelsToRemove,
    };
  }
}
