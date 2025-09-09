import {
  GatewayMetadata,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { OnModuleDestroy, UseFilters } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { WsExceptionFilter } from "src/common/filters";
import { JwtAccessService } from "src/modules/tokens/common/libs/access-token";
import { WebSocketAuthMiddleware } from "src/modules/web-socket-gateway/common/middlewares";
import { EConnectionTypes, EWebSocketEventTypes } from "src/modules/web-socket-gateway/common/enum";
import { PrometheusService } from "src/modules/prometheus/services";
import { NUMBER_OF_MILLISECONDS_IN_SECOND } from "src/common/constants";
import { ConnectionStorageService, EventStorageService } from "src/modules/web-socket-gateway/common/storages";
import { LokiLogger } from "src/common/logger";
import { ToolboxService } from "src/modules/toolbox/services";
import { delay } from "src/common/utils";

@WebSocketGateway(EventsGateway.getGatewayOptions())
@UseFilters(WsExceptionFilter)
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  @WebSocketServer() server: Server;
  private readonly lokiLogger = new LokiLogger("EventsGateway");
  private static isPolling = false;
  private readonly POOLING_EVENTS_INTERVAL: number = 60000;

  constructor(
    private readonly toolboxService: ToolboxService,
    private readonly prometheusService: PrometheusService,
    private readonly connectionStorageService: ConnectionStorageService,
    private readonly eventStorageService: EventStorageService,
    private readonly jwtAccessService: JwtAccessService,
  ) {}

  public static getGatewayOptions(): GatewayMetadata {
    return {
      namespace: "/events",
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
    this.lokiLogger.log("Events WebSocket initialized");
    server.use(WebSocketAuthMiddleware(this.jwtAccessService));
  }

  async handleConnection(client: Socket): Promise<void> {
    this.lokiLogger.log(`Client connected: ${client.id}, User Role ID: ${client.user.userRoleId}`);

    await this.connectionStorageService.addConnection(EConnectionTypes.EVENTS, client.user.userRoleId, client);
    this.prometheusService.connectedClientsGauge.inc();

    if (!EventsGateway.isPolling) {
      EventsGateway.isPolling = true;
      await this.pollNewEvents();
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    this.lokiLogger.log(`Client disconnected: ${client.id}, User Role ID: ${client.user.userRoleId}`);

    const connectionData = await this.connectionStorageService.getConnection(
      EConnectionTypes.EVENTS,
      client.user.userRoleId,
    );

    if (connectionData) {
      const connectionDuration = (Date.now() - connectionData.connectTime) / NUMBER_OF_MILLISECONDS_IN_SECOND;
      this.prometheusService.incrementCounter(connectionDuration);
    }

    await this.connectionStorageService.removeConnection(EConnectionTypes.EVENTS, client.user.userRoleId);
    await this.eventStorageService.clearUserEventCache(client.user.userRoleId);
    this.prometheusService.connectedClientsGauge.dec();
    const remainingConnections = await this.connectionStorageService.getAllConnections(EConnectionTypes.EVENTS);

    if (remainingConnections.length === 0) {
      EventsGateway.isPolling = false;
    }
  }

  onModuleDestroy(): void {
    this.lokiLogger.log("Events WebSocket server is shutting down...");
    this.server.disconnectSockets();
  }

  private async pollNewEvents(): Promise<void> {
    while (EventsGateway.isPolling) {
      const allConnections = await this.connectionStorageService.getAllConnections(EConnectionTypes.EVENTS);

      for (const { user, socketId } of allConnections) {
        try {
          const newSidebarMessages = await this.toolboxService.getSidebarMessages(user);
          const previousSidebarMessages = await this.eventStorageService.getEventCache(
            user.userRoleId,
            EWebSocketEventTypes.SIDEBAR_MESSAGES,
          );

          if (previousSidebarMessages && JSON.stringify(newSidebarMessages) === previousSidebarMessages) {
            continue;
          }

          this.server.to(socketId).emit(EWebSocketEventTypes.SIDEBAR_MESSAGES, newSidebarMessages);
          this.prometheusService.messagesSentCounter.inc();

          await this.eventStorageService.setEventCache(
            user.userRoleId,
            EWebSocketEventTypes.SIDEBAR_MESSAGES,
            newSidebarMessages,
          );
        } catch (error) {
          this.lokiLogger.error(
            `Error broadcasting sidebar messages to userRoleId: ${user.userRoleId}: ${(error as Error).message}`,
          );
        }
      }

      await delay(this.POOLING_EVENTS_INTERVAL);
    }
  }
}
