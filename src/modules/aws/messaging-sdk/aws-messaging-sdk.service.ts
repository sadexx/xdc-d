import {
  ChimeSDKIdentityClient,
  ChimeSDKIdentityClientConfig,
  CreateAppInstanceAdminCommand,
  CreateAppInstanceAdminCommandOutput,
  CreateAppInstanceCommand,
  CreateAppInstanceCommandOutput,
  CreateAppInstanceUserCommand,
  CreateAppInstanceUserCommandOutput,
} from "@aws-sdk/client-chime-sdk-identity";
import {
  ChannelMembershipType,
  ChannelMode,
  ChannelPrivacy,
  ChimeSDKMessagingClient,
  ChimeSDKMessagingClientConfig,
  CreateChannelCommand,
  CreateChannelCommandOutput,
  CreateChannelMembershipCommand,
  CreateChannelMembershipCommandOutput,
  DeleteChannelCommand,
  DeleteChannelCommandOutput,
  DeleteChannelMessageCommand,
  DeleteChannelMessageCommandOutput,
  ListChannelMessagesCommand,
  ListChannelMessagesCommandOutput,
  SortOrder,
} from "@aws-sdk/client-chime-sdk-messaging";
import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IAwsConfigMessagingSdk } from "src/modules/aws/messaging-sdk/common/interfaces";
import { randomUUID } from "node:crypto";
import { Channel } from "src/modules/chime-messaging-configuration/entities";
import { LokiLogger } from "src/common/logger";
import { AwsConfigService } from "src/modules/aws/config/services";

@Injectable()
export class AwsMessagingSdkService {
  private readonly lokiLogger = new LokiLogger(AwsMessagingSdkService.name);
  private readonly identityClient: ChimeSDKIdentityClient;
  private readonly messagingClient: ChimeSDKMessagingClient;
  private readonly MESSAGES_MAX_RESULTS = 50;

  constructor(
    private readonly configService: ConfigService,
    private readonly awsConfigService: AwsConfigService,
  ) {
    const { credentials, chimeMessagingControlRegion } = this.configService.getOrThrow<IAwsConfigMessagingSdk>("aws");

    this.identityClient = new ChimeSDKIdentityClient(
      this.awsConfigService.getStandardClientConfig<ChimeSDKIdentityClientConfig>(
        chimeMessagingControlRegion,
        credentials,
      ),
    );
    this.messagingClient = new ChimeSDKMessagingClient(
      this.awsConfigService.getStandardClientConfig<ChimeSDKMessagingClientConfig>(
        chimeMessagingControlRegion,
        credentials,
      ),
    );
  }

  public async createAppInstance(instanceName: string): Promise<CreateAppInstanceCommandOutput> {
    try {
      const command = new CreateAppInstanceCommand({
        Name: instanceName,
        ClientRequestToken: randomUUID(),
      });
      const response = await this.identityClient.send(command);

      return response;
    } catch (error) {
      this.lokiLogger.error(`Failed to create AppInstance: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException("Unable to create AppInstance");
    }
  }

  public async createAppInstanceUser(appInstanceArn: string): Promise<CreateAppInstanceUserCommandOutput> {
    try {
      const command = new CreateAppInstanceUserCommand({
        AppInstanceArn: appInstanceArn,
        AppInstanceUserId: randomUUID(),
        Name: randomUUID(),
      });
      const response = await this.identityClient.send(command);

      return response;
    } catch (error) {
      this.lokiLogger.error(`Failed to create AppInstanceUser: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException("Unable to create AppInstanceUser");
    }
  }

  public async createAppInstanceAdmin(appInstanceArn: string): Promise<CreateAppInstanceAdminCommandOutput> {
    try {
      const user = await this.createAppInstanceUser(appInstanceArn);
      const command = new CreateAppInstanceAdminCommand({
        AppInstanceArn: appInstanceArn,
        AppInstanceAdminArn: user.AppInstanceUserArn,
      });
      const response = await this.identityClient.send(command);

      return response;
    } catch (error) {
      this.lokiLogger.error(`Failed to create AppInstanceAdmin: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException("Unable to create AppInstanceAdmin");
    }
  }

  public async listChannelMessages(
    channelArn: string,
    chimeBearerArn: string,
    nextToken?: string,
  ): Promise<ListChannelMessagesCommandOutput> {
    try {
      const command = new ListChannelMessagesCommand({
        ChannelArn: channelArn,
        ChimeBearer: chimeBearerArn,
        MaxResults: this.MESSAGES_MAX_RESULTS,
        NextToken: nextToken,
        SortOrder: SortOrder.DESCENDING,
      });
      const response = await this.messagingClient.send(command);

      return response;
    } catch (error) {
      this.lokiLogger.error(`Failed to list channel messages: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException("Unable to list channel messages");
    }
  }

  public async deleteChannelMessage(
    channelArn: string,
    chimeBearerArn: string,
    messageId: string,
  ): Promise<DeleteChannelMessageCommandOutput> {
    try {
      const command = new DeleteChannelMessageCommand({
        ChannelArn: channelArn,
        MessageId: messageId,
        ChimeBearer: chimeBearerArn,
      });
      const response = await this.messagingClient.send(command);

      return response;
    } catch (error) {
      this.lokiLogger.error(`Failed to delete channel message: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException("Unable to delete channel message");
    }
  }

  public async createChannel(
    appInstanceArn: string,
    chimeBearerArn: string,
    channel: Channel,
  ): Promise<CreateChannelCommandOutput> {
    try {
      const command = new CreateChannelCommand({
        AppInstanceArn: appInstanceArn,
        ChimeBearer: chimeBearerArn,
        ChannelId: channel.id,
        Name: randomUUID(),
        ClientRequestToken: randomUUID(),
        Mode: ChannelMode.UNRESTRICTED,
        Privacy: ChannelPrivacy.PRIVATE,
      });
      const response = await this.messagingClient.send(command);

      return response;
    } catch (error) {
      this.lokiLogger.error(`Failed to create channel: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException("Unable to create channel");
    }
  }

  public async createChannelMembership(
    channelArn: string,
    memberArn: string,
    chimeBearerArn: string,
  ): Promise<CreateChannelMembershipCommandOutput> {
    try {
      const command = new CreateChannelMembershipCommand({
        ChannelArn: channelArn,
        MemberArn: memberArn,
        Type: ChannelMembershipType.DEFAULT,
        ChimeBearer: chimeBearerArn,
      });
      const response = await this.messagingClient.send(command);

      return response;
    } catch (error) {
      this.lokiLogger.error(`Failed to add member to channel: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException("Unable to add member to channel");
    }
  }

  public async deleteChannel(channelArn: string, chimeBearerArn: string): Promise<DeleteChannelCommandOutput> {
    try {
      const command = new DeleteChannelCommand({
        ChannelArn: channelArn,
        ChimeBearer: chimeBearerArn,
      });
      const response = await this.messagingClient.send(command);

      return response;
    } catch (error) {
      this.lokiLogger.error(`Failed to delete channel: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException("Unable to delete channel");
    }
  }
}
