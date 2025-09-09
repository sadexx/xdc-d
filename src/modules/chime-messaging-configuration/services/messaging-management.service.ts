import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Channel, ChannelMembership } from "src/modules/chime-messaging-configuration/entities";
import { AwsMessagingSdkService } from "src/modules/aws/messaging-sdk/aws-messaging-sdk.service";
import { UploadFileToChannelDto } from "src/modules/chime-messaging-configuration/common/dto";
import {
  EChannelMembershipType,
  EChannelStatus,
  EChannelType,
} from "src/modules/chime-messaging-configuration/common/enums";
import {
  MessagingCreationService,
  MessagingIdentityService,
  MessagingQueryOptionsService,
} from "src/modules/chime-messaging-configuration/services";
import { AwsS3Service } from "src/modules/aws/s3/aws-s3.service";
import { ChannelEventDto } from "src/modules/web-socket-gateway/common/dto";
import { IS_MEDIA_BUCKET, NUMBER_OF_DAYS_IN_WEEK } from "src/common/constants";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { IMessageOutput } from "src/common/outputs";
import { findManyTyped, findOneOrFailTyped } from "src/common/utils";
import { LokiLogger } from "src/common/logger";
import { IFile } from "src/modules/file-management/common/interfaces";
import {
  TDeleteOldChannels,
  TGetChannelById,
  TJoinChannel,
  TJoinChannelUserRole,
  TUploadFile,
} from "src/modules/chime-messaging-configuration/common/types";
import { UserRole } from "src/modules/users/entities";
import { AccessControlService } from "src/modules/access-control/services";

@Injectable()
export class MessagingManagementService {
  private readonly lokiLogger = new LokiLogger(MessagingManagementService.name);

  constructor(
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,
    @InjectRepository(ChannelMembership)
    private readonly channelMembershipRepository: Repository<ChannelMembership>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly messagingQueryOptionsService: MessagingQueryOptionsService,
    private readonly messagingIdentityService: MessagingIdentityService,
    private readonly messagingCreationService: MessagingCreationService,
    private readonly awsMessagingSdkService: AwsMessagingSdkService,
    private readonly awsS3Service: AwsS3Service,
    private readonly accessControlService: AccessControlService,
  ) {}

  public async joinChannel(id: string, user: ITokenUserData): Promise<void> {
    const queryOptions = this.messagingQueryOptionsService.joinChannelOptions(id, user.userRoleId);

    const userRole = await findOneOrFailTyped<TJoinChannelUserRole>(
      user.userRoleId,
      this.userRoleRepository,
      queryOptions.userRole,
    );

    if (!userRole.profile) {
      throw new BadRequestException("User has not completed their profile.");
    }

    const channel = await findOneOrFailTyped<TJoinChannel>(id, this.channelRepository, queryOptions.channel);
    this.accessControlService.validateSameCompanyAccess(userRole, channel);

    const isUserAlreadyMember = channel.channelMemberships.some(
      (channelMembership) => channelMembership.userRole!.id === userRole.id,
    );

    if (isUserAlreadyMember) {
      throw new BadRequestException("User is already a member of the channel.");
    }

    if (channel.channelMemberships.length > 1) {
      throw new BadRequestException("Channel already has the maximum number of participants.");
    }

    if (channel.channelMemberships.length > 0) {
      if (channel.status === EChannelStatus.NEW) {
        await this.channelRepository.update(channel.id, {
          status: EChannelStatus.IN_PROGRESS,
        });
      }
    }

    await this.messagingCreationService.constructAndCreateChannelMembership(
      channel,
      userRole,
      EChannelMembershipType.MODERATOR,
    );
  }

  public async uploadFile(file: IFile, dto: UploadFileToChannelDto): Promise<string> {
    if (!file) {
      throw new NotFoundException("File not received.");
    }

    const queryOptions = this.messagingQueryOptionsService.uploadFileOptions(dto.id);
    const channel = await findOneOrFailTyped<TUploadFile>(dto.id, this.channelRepository, queryOptions);

    await this.channelRepository.update(channel.id, {
      fileKeys: channel.fileKeys ? [...channel.fileKeys, file.key] : [file.key],
    });

    return this.awsS3Service.getMediaObjectUrl(file.key);
  }

  public async handleWebSocketChannelUpdate(channel: TGetChannelById): Promise<IMessageOutput> {
    const updateData: Partial<Channel> = { updatingDate: new Date() };

    if (channel.status === EChannelStatus.INITIALIZED) {
      updateData.status = channel.type === EChannelType.SUPPORT ? EChannelStatus.NEW : EChannelStatus.IN_PROGRESS;
    }

    const result = await this.channelRepository.update(channel.id, updateData);

    if (!result.affected || result.affected === 0) {
      throw new BadRequestException("Failed to update channel.");
    } else {
      return { message: "Success" };
    }
  }

  public async incrementUnreadCounter(channelId: string, senderId: string): Promise<void> {
    await this.channelMembershipRepository
      .createQueryBuilder()
      .update()
      .set({
        unreadMessagesCount: () => '"unread_messages_count" + 1',
      })
      .where("channel_id = :channelId", { channelId })
      .andWhere("user_role_id != :senderId", { senderId })
      .execute();
  }

  public async resetUnreadCounterByUser(channelArn: string, userRoleId: string): Promise<void> {
    await this.channelMembershipRepository
      .createQueryBuilder()
      .update()
      .set({ unreadMessagesCount: 0 })
      .where("channel_id = (SELECT id FROM channels WHERE channel_arn = :channelArn)", { channelArn })
      .andWhere("user_role_id = :userRoleId", { userRoleId })
      .execute();
  }

  public async deleteChannelMessage(dto: ChannelEventDto): Promise<IMessageOutput> {
    const { adminArn } = await this.messagingIdentityService.getConfig();

    if (!dto.messageId || !dto.channelArn) {
      throw new BadRequestException("Failed to delete channel message");
    }

    await this.awsMessagingSdkService.deleteChannelMessage(dto.channelArn, adminArn, dto.messageId);

    return { message: "Success" };
  }

  public async deleteOldChannels(): Promise<void> {
    const WEEKS = 3;
    const threeWeeksAgo = new Date();

    threeWeeksAgo.setDate(threeWeeksAgo.getDate() - WEEKS * NUMBER_OF_DAYS_IN_WEEK);

    const queryOptions = this.messagingQueryOptionsService.deleteOldChannelsOptions(threeWeeksAgo);
    const channelsToDelete = await findManyTyped<TDeleteOldChannels[]>(this.channelRepository, queryOptions);

    if (channelsToDelete.length === 0) {
      return;
    }

    const { adminArn } = await this.messagingIdentityService.getConfig();

    for (const channel of channelsToDelete) {
      if (channel.channelArn) {
        await this.awsMessagingSdkService.deleteChannel(channel.channelArn, adminArn);
      }

      if (channel.fileKeys && channel.fileKeys.length > 0) {
        const objectsToDelete = channel.fileKeys.map((Key) => ({ Key }));
        await this.awsS3Service.deleteObjects(objectsToDelete, IS_MEDIA_BUCKET);
      }
    }

    const channelIds = channelsToDelete.map((channel) => channel.id);
    await this.channelRepository.delete({ id: In(channelIds) });

    this.lokiLogger.log(`Deleted ${channelsToDelete.length} resolved or initialized channels older than 3 weeks.`);
  }
}
