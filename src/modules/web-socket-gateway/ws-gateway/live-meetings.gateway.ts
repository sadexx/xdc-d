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
} from "@nestjs/websockets";
import { OnModuleDestroy, UseFilters } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { WsExceptionFilter } from "src/common/filters";
import { JwtAccessService } from "src/modules/tokens/common/libs/access-token";
import { EConnectionTypes, EWebSocketEventTypes } from "src/modules/web-socket-gateway/common/enum";
import { AppointmentEventDto } from "src/modules/web-socket-gateway/common/dto";
import { PrometheusService } from "src/modules/prometheus/services";
import { NUMBER_OF_MILLISECONDS_IN_SECOND } from "src/common/constants";
import { WebSocketClientAuthMiddleware } from "src/modules/web-socket-gateway/common/middlewares";
import { AppointmentExtensionService } from "src/modules/appointments/appointment/services";
import { IWebSocketUserData } from "src/modules/web-socket-gateway/common/interfaces";
import { ConnectionStorageService } from "src/modules/web-socket-gateway/common/storages";
import { LokiLogger } from "src/common/logger";

@WebSocketGateway(LiveMeetingGateway.getGatewayOptions())
@UseFilters(WsExceptionFilter)
export class LiveMeetingGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  @WebSocketServer() server: Server;
  private readonly lokiLogger = new LokiLogger("LiveMeetingGateway");

  constructor(
    private readonly prometheusService: PrometheusService,
    private readonly appointmentExtensionService: AppointmentExtensionService,
    private readonly connectionStorageService: ConnectionStorageService,
    private readonly jwtAccessService: JwtAccessService,
  ) {}

  public static getGatewayOptions(): GatewayMetadata {
    return {
      namespace: "/live-meetings",
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
    this.lokiLogger.log("Live Meeting WebSocket initialized");
    server.use(WebSocketClientAuthMiddleware(this.jwtAccessService));
  }

  async handleConnection(client: Socket): Promise<void> {
    this.lokiLogger.log(`Client connected: ${client.id}, User Role ID: ${client.user.userRoleId}`);

    await this.connectionStorageService.addConnection(EConnectionTypes.LIVE_MEETINGS, client.user.userRoleId, client);
    this.prometheusService.connectedClientsGauge.inc();
  }

  async handleDisconnect(client: Socket): Promise<void> {
    this.lokiLogger.log(`Client disconnected: ${client.id}, User Role ID: ${client.user.userRoleId}`);

    const connectionData = await this.connectionStorageService.getConnection(
      EConnectionTypes.LIVE_MEETINGS,
      client.user.userRoleId,
    );

    if (connectionData) {
      const connectionDuration = (Date.now() - connectionData.connectTime) / NUMBER_OF_MILLISECONDS_IN_SECOND;
      this.prometheusService.incrementCounter(connectionDuration);
    }

    await this.connectionStorageService.removeConnection(EConnectionTypes.LIVE_MEETINGS, client.user.userRoleId);
    this.prometheusService.connectedClientsGauge.dec();
  }

  onModuleDestroy(): void {
    this.lokiLogger.log("Live Meeting WebSocket server is shutting down...");
    this.server.disconnectSockets();
  }

  @SubscribeMessage("message")
  async handleMessage(@ConnectedSocket() client: Socket, @MessageBody() message: AppointmentEventDto): Promise<void> {
    switch (message.event) {
      case EWebSocketEventTypes.LIVE_SESSIONS: {
        const user: IWebSocketUserData = client.user;
        const messages = await this.appointmentExtensionService.updateAppointmentActivityTime(
          message.appointmentId,
          user,
          message.isViewConfirmed,
        );
        this.prometheusService.messagesSentCounter.inc();
        client.emit(EWebSocketEventTypes.LIVE_SESSIONS, messages);
        break;
      }

      default:
        this.lokiLogger.error(`Unhandled event: ${message.event}`);
        client.disconnect();
    }
  }
}
