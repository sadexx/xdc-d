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
import { AppointmentExtensionService, AppointmentQueryService } from "src/modules/appointments/appointment/services";
import { IConnectionData, IWebSocketUserData } from "src/modules/web-socket-gateway/common/interfaces";
import { ConnectionStorageService } from "src/modules/web-socket-gateway/common/storages";
import { LokiLogger } from "src/common/logger";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { delay } from "src/common/utils";

@WebSocketGateway(LiveMeetingGateway.getGatewayOptions())
@UseFilters(WsExceptionFilter)
export class LiveMeetingGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  @WebSocketServer() server: Server;
  private readonly lokiLogger = new LokiLogger("LiveMeetingGateway");
  private static isPolling = false;
  private readonly POOLING_ON_DEMAND_INTERVAL: number = 30000;

  constructor(
    private readonly prometheusService: PrometheusService,
    private readonly appointmentExtensionService: AppointmentExtensionService,
    private readonly appointmentQueryService: AppointmentQueryService,
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

    if (!LiveMeetingGateway.isPolling) {
      LiveMeetingGateway.isPolling = true;
      await this.pollOnDemandAppointmentStatuses();
    }
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
    const remainingConnections = await this.connectionStorageService.getAllConnections(EConnectionTypes.LIVE_MEETINGS);

    if (remainingConnections.length === 0) {
      LiveMeetingGateway.isPolling = false;
    }
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

  private async pollOnDemandAppointmentStatuses(): Promise<void> {
    try {
      while (LiveMeetingGateway.isPolling) {
        const connections = await this.connectionStorageService.getAllConnections(EConnectionTypes.LIVE_MEETINGS);

        if (connections.length === 0) {
          await delay(this.POOLING_ON_DEMAND_INTERVAL);
          continue;
        }

        const userRoleIds = connections.map((connection) => connection.user.userRoleId);
        const allAppointments = await this.appointmentQueryService.getUsersPendingOnDemandAppointments(userRoleIds);

        if (allAppointments.length === 0) {
          await delay(this.POOLING_ON_DEMAND_INTERVAL);
          continue;
        }

        await this.broadcastOnDemandAppointmentStatuses(allAppointments, connections);

        await delay(this.POOLING_ON_DEMAND_INTERVAL);
      }
    } catch (error) {
      this.lokiLogger.error(
        `Error polling appointment statuses:  ${(error as Error).message}, ${(error as Error).stack}`,
      );
      LiveMeetingGateway.isPolling = false;
    }
  }

  private async broadcastOnDemandAppointmentStatuses(
    appointments: Appointment[],
    connections: IConnectionData[],
  ): Promise<void> {
    const appointmentsByClient = this.groupAppointmentByClient(appointments);

    for (const { user, socketId } of connections) {
      const clientAppointment = appointmentsByClient.get(user.userRoleId);

      if (!clientAppointment) {
        continue;
      }

      this.server.to(socketId).emit(EWebSocketEventTypes.ON_DEMAND_APPOINTMENT_STATUS_UPDATE, clientAppointment);
    }
  }

  private groupAppointmentByClient(appointments: Appointment[]): Map<string, Appointment> {
    const grouped = new Map<string, Appointment>();

    for (const appointment of appointments) {
      if (appointment.clientId && !grouped.has(appointment.clientId)) {
        grouped.set(appointment.clientId, appointment);
      }
    }

    return grouped;
  }
}
