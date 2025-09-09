import {
  ConnectedSocket,
  GatewayMetadata,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from "@nestjs/websockets";
import { UseFilters } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { WsExceptionFilter } from "src/common/filters";
import { JwtAccessService } from "src/modules/tokens/common/libs/access-token";
import { EConnectionTypes, EWebSocketEventTypes } from "src/modules/web-socket-gateway/common/enum";
import { PrometheusService } from "src/modules/prometheus/services";
import { WebSocketAuthMiddleware } from "src/modules/web-socket-gateway/common/middlewares";
import { MessagingManagementService, MessagingQueryService } from "src/modules/chime-messaging-configuration/services";
import { ChannelEventDto } from "src/modules/web-socket-gateway/common/dto";
import { NUMBER_OF_MILLISECONDS_IN_SECOND } from "src/common/constants";
import { delay } from "src/common/utils";
import { IGetAllChannelsWebSocketOutput } from "src/modules/chime-messaging-configuration/common/outputs";
import { ActiveChannelStorageService, ConnectionStorageService } from "src/modules/web-socket-gateway/common/storages";
import { NotificationService } from "src/modules/notifications/services";
import { LokiLogger } from "src/common/logger";
import { TGetChannelById } from "src/modules/chime-messaging-configuration/common/types";

@WebSocketGateway(ChannelGateway.getGatewayOptions())
@UseFilters(WsExceptionFilter)
export class ChannelGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly lokiLogger = new LokiLogger("ChannelGateway");
  private static isPolling = false;
  private readonly POOLING_CHANNELS_INTERVAL: number = 60000;
  private lastChecked: Date = new Date();

  constructor(
    private readonly prometheusService: PrometheusService,
    private readonly connectionStorageService: ConnectionStorageService,
    private readonly activeChannelStorageService: ActiveChannelStorageService,
    private readonly messagingManagementService: MessagingManagementService,
    private readonly messagingQueryService: MessagingQueryService,
    private readonly jwtAccessService: JwtAccessService,
    private readonly notificationService: NotificationService,
  ) {}

  public static getGatewayOptions(): GatewayMetadata {
    return {
      namespace: "/channels",
      cookie: true,
      cors: {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        origin: process.env.FRONTEND_URIS_CORS!.split(","),
        methods: ["GET", "POST"],
        credentials: true,
      },
      pingInterval: 15000,
      pingTimeout: 10000,
    };
  }

  afterInit(server: Server): void {
    this.lokiLogger.log("Channel WebSocket initialized");
    server.use(WebSocketAuthMiddleware(this.jwtAccessService));
  }

  async handleConnection(client: Socket): Promise<void> {
    this.lokiLogger.log(`Client connected: ${client.id}, User Role ID: ${client.user.userRoleId}`);

    await this.connectionStorageService.addConnection(EConnectionTypes.CHANNELS, client.user.userRoleId, client);
    this.prometheusService.connectedClientsGauge.inc();
    this.prometheusService.connectedClientsGauge.inc();

    if (!ChannelGateway.isPolling) {
      ChannelGateway.isPolling = true;
      await this.pollNewChannels();
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    this.lokiLogger.log(`Client disconnected: ${client.id}, User Role ID: ${client.user.userRoleId}`);

    const connectionData = await this.connectionStorageService.getConnection(
      EConnectionTypes.CHANNELS,
      client.user.userRoleId,
    );

    if (connectionData) {
      const connectionDuration = (Date.now() - connectionData.connectTime) / NUMBER_OF_MILLISECONDS_IN_SECOND;
      this.prometheusService.incrementCounter(connectionDuration);
    }

    await this.connectionStorageService.removeConnection(EConnectionTypes.CHANNELS, client.user.userRoleId);
    await this.activeChannelStorageService.removeActiveChannel(client.user.userRoleId);
    this.prometheusService.connectedClientsGauge.dec();

    const remainingConnections = await this.connectionStorageService.getAllConnections(EConnectionTypes.CHANNELS);

    if (remainingConnections.length === 0) {
      ChannelGateway.isPolling = false;
    }
  }

  onModuleDestroy(): void {
    this.lokiLogger.log("Channel WebSocket server is shutting down...");
    this.server.disconnectSockets();
  }

  @SubscribeMessage("message")
  async handleMessage(@ConnectedSocket() client: Socket, @MessageBody() message: ChannelEventDto): Promise<void> {
    try {
      switch (message.event) {
        case EWebSocketEventTypes.CHANNEL_MESSAGE: {
          if (!message.id) {
            break;
          }

          const channel = await this.messagingQueryService.getChannelById(message.id);
          const messages = await this.messagingManagementService.handleWebSocketChannelUpdate(channel);
          this.prometheusService.messagesSentCounter.inc();
          client.emit(EWebSocketEventTypes.CHANNEL_MESSAGE, messages);
          await this.syncActiveChannelAndNotifyMembers(channel, client.user.userRoleId);

          break;
        }

        case EWebSocketEventTypes.CHANNEL_DELETE_MESSAGE:
          await this.messagingManagementService.deleteChannelMessage(message);
          this.prometheusService.messagesSentCounter.inc();
          client.emit(EWebSocketEventTypes.CHANNEL_DELETE_MESSAGE, message);
          break;

        case EWebSocketEventTypes.RESET_ACTIVE_CHANNEL:
          await this.activeChannelStorageService.removeActiveChannel(client.user.userRoleId);
          this.prometheusService.messagesSentCounter.inc();
          client.emit(EWebSocketEventTypes.RESET_ACTIVE_CHANNEL, message);
          break;

        default:
          this.lokiLogger.error(`Unhandled event: ${message.event}`);
          client.disconnect();
      }
    } catch (error) {
      this.lokiLogger.error(`Error handling channel message: ${(error as Error).message}, ${(error as Error).stack}`);
      client.emit("error", { message: "An error occurred while processing your request." });
      throw new WsException((error as Error).message);
    }
  }

  private async broadcastNewChannels(newChannelsMap: Map<string, IGetAllChannelsWebSocketOutput>): Promise<void> {
    const allConnections = await this.connectionStorageService.getAllConnections(EConnectionTypes.CHANNELS);

    for (const { user, socketId } of allConnections) {
      const newChannels = newChannelsMap.get(user.userRoleId);

      if (!newChannels) {
        continue;
      }

      for (const channel of newChannels.privateChannels) {
        try {
          this.lokiLogger.log(`Send private channel to userRoleId: ${user.userRoleId}, SocketId: ${socketId}`);
          this.server.to(socketId).emit(EWebSocketEventTypes.NEW_PRIVATE_CHANNELS, channel);
          this.prometheusService.messagesSentCounter.inc();
        } catch (error) {
          this.lokiLogger.error(
            `Failed to emit private channel to socketId: ${socketId} message: ${(error as Error).message}, ${(error as Error).stack}`,
          );
        }
      }

      for (const channel of newChannels.supportChannels) {
        try {
          this.lokiLogger.log(`Send support channel to userRoleId: ${user.userRoleId}, SocketId: ${socketId}`);
          this.server.to(socketId).emit(EWebSocketEventTypes.NEW_SUPPORT_CHANNELS, channel);
          this.prometheusService.messagesSentCounter.inc();
        } catch (error) {
          this.lokiLogger.error(
            `Failed to emit support channel to socketId: ${socketId} message: ${(error as Error).message}, ${(error as Error).stack}`,
          );
        }
      }
    }
  }

  private async pollNewChannels(): Promise<void> {
    while (ChannelGateway.isPolling) {
      const newChannelsMap = new Map<string, IGetAllChannelsWebSocketOutput>();

      const allConnections = await this.connectionStorageService.getAllConnections(EConnectionTypes.CHANNELS);

      for (const { user } of allConnections) {
        const newChannels = await this.messagingQueryService.getNewChannelsForWebSocket(
          user.userRoleId,
          user.role,
          user.operatedByCompanyId,
          this.lastChecked,
        );

        if (newChannels.privateChannels.length > 0 || newChannels.supportChannels.length > 0) {
          this.lokiLogger.log(
            `Found new channels for userRoleId: ${user.userRoleId}, Private: ${newChannels.privateChannels.length}, Support: ${newChannels.supportChannels.length}`,
          );
        }

        newChannelsMap.set(user.userRoleId, newChannels);
      }

      this.lastChecked = new Date();

      if (newChannelsMap.size > 0) {
        await this.broadcastNewChannels(newChannelsMap);
      } else {
        this.lokiLogger.log("No new channels found");
      }

      await delay(this.POOLING_CHANNELS_INTERVAL);
    }
  }

  private async syncActiveChannelAndNotifyMembers(channel: TGetChannelById, userRoleId: string): Promise<void> {
    for (const membership of channel.channelMemberships) {
      if (!membership.userRole) {
        this.lokiLogger.warn(`Channel membership without userRole found for channelId: ${channel.id}`);
        continue;
      }

      if (membership.userRole.id === userRoleId) {
        const activeChannelArn = await this.activeChannelStorageService.getActiveChannel(userRoleId);

        if (channel.channelArn && activeChannelArn !== channel.channelArn) {
          await this.activeChannelStorageService.setActiveChannel(userRoleId, channel.channelArn);
          this.messagingManagementService
            .resetUnreadCounterByUser(channel.channelArn, userRoleId)
            .catch((error: Error) => {
              this.lokiLogger.error(`Failed to reset unread counter for userRoleId: ${userRoleId}`, error.stack);
            });
        }

        continue;
      }

      const activeChannelArn = await this.activeChannelStorageService.getActiveChannel(membership.userRole.id);

      if (activeChannelArn !== channel.channelArn) {
        this.messagingManagementService.incrementUnreadCounter(channel.id, userRoleId).catch((error: Error) => {
          this.lokiLogger.error(`Failed to increment unread counter error: ${error.message}, ${error.stack}`);
        });
        this.notificationService
          .sendChannelMessageNotification(membership.userRole.id, channel.platformId, {
            channelId: channel.id,
            channelType: channel.type,
          })
          .catch((error: Error) => {
            this.lokiLogger.error(
              `Failed to send new message notification for userRoleId: ${membership.userRole?.id}`,
              error.stack,
            );
          });
      }
    }
  }
}
