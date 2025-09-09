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
import { OnModuleDestroy, UseFilters } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { WsExceptionFilter } from "src/common/filters";
import { JwtAccessService } from "src/modules/tokens/common/libs/access-token";
import { WebSocketAuthInterpreterMiddleware } from "src/modules/web-socket-gateway/common/middlewares";
import { EConnectionTypes, EWebSocketEventTypes } from "src/modules/web-socket-gateway/common/enum";
import { OrderEventDto } from "src/modules/web-socket-gateway/common/dto";
import { PrometheusService } from "src/modules/prometheus/services";
import { delay } from "src/common/utils";
import { NUMBER_OF_MILLISECONDS_IN_SECOND } from "src/common/constants";
import { ConnectionStorageService } from "src/modules/web-socket-gateway/common/storages";
import { InterpreterProfileService } from "src/modules/interpreters/profile/services";
import { AppointmentOrderQueryService } from "src/modules/appointment-orders/appointment-order/services";
import { plainToInstance } from "class-transformer";
import {
  GetWebsocketAppointmentOrderGroupOutput,
  GetWebsocketAppointmentOrderOutput,
  IAllTypeAppointmentOrdersOutput,
} from "src/modules/appointment-orders/appointment-order/common/outputs";
import { LokiLogger } from "src/common/logger";

@WebSocketGateway(OrderGateway.getGatewayOptions())
@UseFilters(WsExceptionFilter)
export class OrderGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  @WebSocketServer() server: Server;
  private readonly lokiLogger = new LokiLogger("OrderGateway");
  private static isPolling = false;
  private readonly POOLING_ORDERS_INTERVAL: number = 60000;

  constructor(
    private readonly appointmentOrderQueryService: AppointmentOrderQueryService,
    private readonly prometheusService: PrometheusService,
    private readonly connectionStorageService: ConnectionStorageService,
    private readonly interpreterProfileService: InterpreterProfileService,
    private readonly jwtAccessService: JwtAccessService,
  ) {}

  public static getGatewayOptions(): GatewayMetadata {
    return {
      namespace: "/orders",
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
    this.lokiLogger.log("Order WebSocket initialized");
    server.use(WebSocketAuthInterpreterMiddleware(this.jwtAccessService));
  }

  async handleConnection(client: Socket): Promise<void> {
    this.lokiLogger.log(`Client connected: ${client.id}, User Role ID: ${client.user.userRoleId}`);

    await this.connectionStorageService.addConnection(EConnectionTypes.ORDERS, client.user.userRoleId, client);
    this.prometheusService.connectedClientsGauge.inc();

    if (!OrderGateway.isPolling) {
      OrderGateway.isPolling = true;
      await this.pollNewOrders();
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    this.lokiLogger.log(`Client disconnected: ${client.id}, User Role ID: ${client.user.userRoleId}`);

    const connectionData = await this.connectionStorageService.getConnection(
      EConnectionTypes.ORDERS,
      client.user.userRoleId,
    );

    if (connectionData) {
      const connectionDuration = (Date.now() - connectionData.connectTime) / NUMBER_OF_MILLISECONDS_IN_SECOND;
      this.prometheusService.incrementCounter(connectionDuration);
    }

    await this.connectionStorageService.removeConnection(EConnectionTypes.ORDERS, client.user.userRoleId);
    this.prometheusService.connectedClientsGauge.dec();
    const remainingConnections = await this.connectionStorageService.getAllConnections(EConnectionTypes.ORDERS);

    if (remainingConnections.length === 0) {
      OrderGateway.isPolling = false;
    }
  }

  onModuleDestroy(): void {
    this.lokiLogger.log("Order WebSocket server is shutting down...");
    this.server.disconnectSockets();
  }

  @SubscribeMessage("message")
  public async handleMessage(@ConnectedSocket() client: Socket, @MessageBody() message: OrderEventDto): Promise<void> {
    try {
      switch (message.event) {
        case EWebSocketEventTypes.UPDATE_INTERPRETER_LOCATION: {
          const messages = await this.interpreterProfileService.updateInterpreterLocation(message);
          this.prometheusService.messagesSentCounter.inc();
          client.emit(EWebSocketEventTypes.UPDATE_INTERPRETER_LOCATION, messages);
          break;
        }

        default:
          this.lokiLogger.error(`Unhandled event: ${message.event}`);
          client.disconnect();
      }
    } catch (error) {
      this.lokiLogger.error(`Error handling message: ${(error as Error).message}, ${(error as Error).stack}`);
      client.emit("error", { message: "An error occurred while processing your request." });
      throw new WsException("Invalid Data");
    }
  }

  private async broadcastNewOrders(appointmentOrdersOutput: IAllTypeAppointmentOrdersOutput): Promise<void> {
    const { appointmentOrders, appointmentOrdersGroups } = appointmentOrdersOutput;

    try {
      const allConnections = await this.connectionStorageService.getAllConnections(EConnectionTypes.ORDERS);

      for (const newOrder of appointmentOrders) {
        for (const { user, socketId } of allConnections) {
          this.lokiLogger.log(`Send individual order to UserRoleId: ${user.userRoleId}, SocketId: ${socketId}`);

          if (
            newOrder.matchedInterpreterIds.includes(user.userRoleId) &&
            !newOrder.rejectedInterpreterIds.includes(user.userRoleId)
          ) {
            const serializedIndividualOrder = plainToInstance(GetWebsocketAppointmentOrderOutput, newOrder);
            try {
              this.server.to(socketId).emit(EWebSocketEventTypes.NEW_APPOINTMENT_ORDERS, serializedIndividualOrder);
              this.prometheusService.messagesSentCounter.inc();
            } catch (error) {
              this.lokiLogger.error(
                `Failed to emit individual order to socketId: ${socketId} message: ${(error as Error).message}, ${(error as Error).stack}`,
              );
            }
          }
        }
      }

      for (const newGroupOrder of appointmentOrdersGroups) {
        for (const { user, socketId } of allConnections) {
          this.lokiLogger.log(`Send group order to UserRoleId: ${user.userRoleId}, SocketId: ${socketId}`);

          if (
            newGroupOrder.matchedInterpreterIds.includes(user.userRoleId) &&
            !newGroupOrder.rejectedInterpreterIds.includes(user.userRoleId)
          ) {
            const serializedGroupOrder = plainToInstance(GetWebsocketAppointmentOrderGroupOutput, newGroupOrder);
            try {
              this.server.to(socketId).emit(EWebSocketEventTypes.NEW_APPOINTMENT_ORDERS_GROUPS, serializedGroupOrder);
              this.prometheusService.messagesSentCounter.inc();
            } catch (error) {
              this.lokiLogger.error(
                `Failed to emit group order to socketId: ${socketId} message: ${(error as Error).message}, ${(error as Error).stack}`,
              );
            }
          }
        }
      }
    } catch (error) {
      this.lokiLogger.error(`Error during broadcasting orders: ${(error as Error).message}, ${(error as Error).stack}`);
    }
  }

  private async pollNewOrders(): Promise<void> {
    while (OrderGateway.isPolling) {
      const newOrders = await this.appointmentOrderQueryService.getNewOrdersForWebSocket();

      if (newOrders.appointmentOrders.length > 0 || newOrders.appointmentOrdersGroups.length > 0) {
        this.lokiLogger.log(
          `Found new orders, Individual: ${newOrders.appointmentOrders.length}, Groups: ${newOrders.appointmentOrdersGroups.length}`,
        );
        await this.broadcastNewOrders(newOrders);
      }

      if (newOrders.appointmentOrders.length === 0 && newOrders.appointmentOrdersGroups.length === 0) {
        this.lokiLogger.log("No new orders found");
      }

      await delay(this.POOLING_ORDERS_INTERVAL);
    }
  }
}
