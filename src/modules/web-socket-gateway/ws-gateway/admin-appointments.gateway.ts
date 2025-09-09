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
import { WebSocketAdminAuthMiddleware } from "src/modules/web-socket-gateway/common/middlewares";
import { EConnectionTypes, EWebSocketEventTypes } from "src/modules/web-socket-gateway/common/enum";
import { PrometheusService } from "src/modules/prometheus/services";
import { delay, isInRoles } from "src/common/utils";
import {
  CORPORATE_CLIENTS_COMPANY_ADMIN_ROLES,
  CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_COMPANY_ADMIN_ROLES,
  CORPORATE_INTERPRETING_PROVIDERS_COMPANY_ADMIN_ROLES,
  LFH_ADMIN_ROLES,
  NUMBER_OF_MILLISECONDS_IN_SECOND,
} from "src/common/constants";
import { ConnectionStorageService } from "src/modules/web-socket-gateway/common/storages";
import { LokiLogger } from "src/common/logger";
import { AppointmentQueryService } from "src/modules/appointments/appointment/services";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { IConnectionData } from "src/modules/web-socket-gateway/common/interfaces";
import { IWebSocketAppointmentsOutput } from "src/modules/appointments/appointment/common/outputs";

@WebSocketGateway(AdminAppointmentsGateway.getGatewayOptions())
@UseFilters(WsExceptionFilter)
export class AdminAppointmentsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  @WebSocketServer() server: Server;
  private readonly lokiLogger = new LokiLogger("AdminAppointmentsGateway");
  private static isPolling = false;
  private readonly POOLING_ORDERS_INTERVAL: number = 60000;

  constructor(
    private readonly appointmentQueryService: AppointmentQueryService,
    private readonly prometheusService: PrometheusService,
    private readonly connectionStorageService: ConnectionStorageService,
    private readonly jwtAccessService: JwtAccessService,
  ) {}

  public static getGatewayOptions(): GatewayMetadata {
    return {
      namespace: "/admin-appointments",
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
    server.use(WebSocketAdminAuthMiddleware(this.jwtAccessService));
  }

  async handleConnection(client: Socket): Promise<void> {
    this.lokiLogger.log(`Client connected: ${client.id}, User Role ID: ${client.user.userRoleId}`);

    await this.connectionStorageService.addConnection(EConnectionTypes.APPOINTMENTS, client.user.userRoleId, client);
    this.prometheusService.connectedClientsGauge.inc();

    if (!AdminAppointmentsGateway.isPolling) {
      AdminAppointmentsGateway.isPolling = true;
      await this.pollNewAppointments();
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    this.lokiLogger.log(`Client disconnected: ${client.id}, User Role ID: ${client.user.userRoleId}`);

    const connectionData = await this.connectionStorageService.getConnection(
      EConnectionTypes.APPOINTMENTS,
      client.user.userRoleId,
    );

    if (connectionData) {
      const connectionDuration = (Date.now() - connectionData.connectTime) / NUMBER_OF_MILLISECONDS_IN_SECOND;
      this.prometheusService.incrementCounter(connectionDuration);
    }

    await this.connectionStorageService.removeConnection(EConnectionTypes.APPOINTMENTS, client.user.userRoleId);
    this.prometheusService.connectedClientsGauge.dec();
    const remainingConnections = await this.connectionStorageService.getAllConnections(EConnectionTypes.APPOINTMENTS);

    if (remainingConnections.length === 0) {
      AdminAppointmentsGateway.isPolling = false;
    }
  }

  onModuleDestroy(): void {
    this.lokiLogger.log("Appointment WebSocket server is shutting down...");
    this.server.disconnectSockets();
  }

  private async pollNewAppointments(): Promise<void> {
    try {
      while (AdminAppointmentsGateway.isPolling) {
        const newAppointments = await this.appointmentQueryService.getNewAppointmentsForWebSocket();

        if (
          newAppointments.newAppointments.length > 0 ||
          newAppointments.newAppointmentGroups.length > 0 ||
          newAppointments.newRedFlagAppointments.length > 0 ||
          newAppointments.newRedFlagAppointmentGroups.length > 0
        ) {
          this.lokiLogger.log(
            `Found new appointments - Singles: ${newAppointments.newAppointments.length}, ` +
              `Groups: ${newAppointments.newAppointmentGroups.length}, ` +
              `Red Flag: ${newAppointments.newRedFlagAppointments.length}, ` +
              `Red Flag Groups: ${newAppointments.newRedFlagAppointmentGroups.length}`,
          );
          await this.broadcastAppointments(newAppointments);
        }

        if (
          newAppointments.newAppointments.length === 0 &&
          newAppointments.newAppointmentGroups.length === 0 &&
          newAppointments.newRedFlagAppointments.length === 0 &&
          newAppointments.newRedFlagAppointmentGroups.length === 0
        ) {
          this.lokiLogger.log("No new appointments found");
        }

        await delay(this.POOLING_ORDERS_INTERVAL);
      }
    } catch (error) {
      this.lokiLogger.error(
        `Error during polling and broadcasting: ${(error as Error).message}, ${(error as Error).stack}`,
      );
    }
  }

  private async broadcastAppointments(appointmentOutput: IWebSocketAppointmentsOutput): Promise<void> {
    const connections = await this.connectionStorageService.getAllConnections(EConnectionTypes.APPOINTMENTS);
    const { newAppointments, newAppointmentGroups, newRedFlagAppointments, newRedFlagAppointmentGroups } =
      appointmentOutput;

    if (connections.length === 0) {
      return;
    }

    await this.broadcastIndividualAppointments(newAppointments, EWebSocketEventTypes.NEW_APPOINTMENTS, connections);

    await this.broadcastIndividualAppointments(
      newRedFlagAppointments,
      EWebSocketEventTypes.RED_FLAG_APPOINTMENTS,
      connections,
    );

    await this.broadcastAppointmentGroups(
      newAppointmentGroups,
      EWebSocketEventTypes.NEW_APPOINTMENT_GROUPS,
      connections,
    );

    await this.broadcastRedFlagAppointmentGroups(
      newRedFlagAppointmentGroups,
      EWebSocketEventTypes.RED_FLAG_APPOINTMENT_GROUPS,
      connections,
    );
  }

  private async broadcastIndividualAppointments(
    appointments: Appointment[],
    eventType: string,
    connections: IConnectionData[],
  ): Promise<void> {
    if (appointments.length === 0) {
      return;
    }

    this.lokiLogger.log(`Broadcasting ${appointments.length} appointments for event: ${eventType}`);

    for (const appointment of appointments) {
      await this.broadcast(appointment, eventType, connections);
    }
  }

  private async broadcastAppointmentGroups(
    groupedAppointments: Appointment[],
    eventType: string,
    connections: IConnectionData[],
  ): Promise<void> {
    if (groupedAppointments.length === 0) {
      return;
    }

    const appointmentGroups = await this.groupAppointmentsByGroupId(groupedAppointments);

    for (const [groupId, appointments] of appointmentGroups.entries()) {
      this.lokiLogger.log(
        `Broadcasting appointment group ${groupId} with ${appointments.length} appointments for event: ${eventType}`,
      );

      await this.broadcast(appointments, eventType, connections);
    }
  }

  private async broadcastRedFlagAppointmentGroups(
    appointments: Appointment[],
    eventType: string,
    connections: IConnectionData[],
  ): Promise<void> {
    if (appointments.length === 0) {
      return;
    }

    for (const appointment of appointments) {
      if (!appointment.appointmentsGroupId) {
        this.lokiLogger.error(`Found appointment in group array without appointmentsGroupId: ${appointment.id}`);
        continue;
      }

      const appointmentGroups = await this.appointmentQueryService.getAppointmentGroupWithRedFlagForWebSocket(
        appointment.appointmentsGroupId,
      );
      this.lokiLogger.log(
        `Broadcasting appointment group ${appointment.appointmentsGroupId} with ${appointmentGroups.length} appointments for event: ${eventType}`,
      );

      await this.broadcast(appointmentGroups, eventType, connections);
    }
  }

  private async groupAppointmentsByGroupId(appointments: Appointment[]): Promise<Map<string, Appointment[]>> {
    const groups = new Map<string, Appointment[]>();

    for (const appointment of appointments) {
      if (!appointment.appointmentsGroupId) {
        this.lokiLogger.error(`Found appointment in group array without appointmentsGroupId: ${appointment.id}`);
        continue;
      }

      if (!groups.has(appointment.appointmentsGroupId)) {
        groups.set(appointment.appointmentsGroupId, []);
      }

      groups.get(appointment.appointmentsGroupId)?.push(appointment);
    }

    return groups;
  }

  private async broadcast(
    appointments: Appointment[] | Appointment,
    eventType: string,
    connections: IConnectionData[],
  ): Promise<void> {
    if (!appointments) {
      return;
    }

    const referenceAppointment = Array.isArray(appointments) ? appointments[0] : appointments;
    const eligibleConnections = await this.getEligibleConnections(referenceAppointment, connections);
    const socketIds = eligibleConnections.map((connection) => connection.socketId);

    if (socketIds.length === 0) {
      this.lokiLogger.log(`No eligible recipients for ${eventType}`);

      return;
    }

    this.server.to(socketIds).emit(eventType, appointments);
    this.prometheusService.messagesSentCounter.inc(socketIds.length);
  }

  private async getEligibleConnections(
    appointment: Appointment,
    connections: IConnectionData[],
  ): Promise<IConnectionData[]> {
    return connections.filter(({ user }) => {
      if (isInRoles(LFH_ADMIN_ROLES, user.role)) {
        return true;
      }

      if (
        isInRoles(
          [
            ...CORPORATE_CLIENTS_COMPANY_ADMIN_ROLES,
            ...CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_COMPANY_ADMIN_ROLES,
          ],
          user.role,
        )
      ) {
        return user.operatedByCompanyId === appointment.operatedByCompanyId;
      }

      if (isInRoles(CORPORATE_INTERPRETING_PROVIDERS_COMPANY_ADMIN_ROLES, user.role)) {
        if (user.operatedByCompanyId === appointment.operatedByCompanyId) {
          return true;
        }

        return user.operatedByCompanyId === appointment.operatedByMainCorporateCompanyId;
      }

      return false;
    });
  }
}
