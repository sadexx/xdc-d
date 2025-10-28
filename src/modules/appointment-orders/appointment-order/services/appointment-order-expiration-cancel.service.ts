import { InjectRepository } from "@nestjs/typeorm";
import { ObjectLiteral, Repository } from "typeorm";
import { Appointment, AppointmentReminder } from "src/modules/appointments/appointment/entities";
import { ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import {
  EAppointmentCommunicationType,
  EAppointmentSchedulingType,
  EAppointmentStatus,
} from "src/modules/appointments/appointment/common/enums";
import { AppointmentOrderNotificationService } from "src/modules/appointment-orders/appointment-order/services";
import { AppointmentOrder, AppointmentOrderGroup } from "src/modules/appointment-orders/appointment-order/entities";
import { NotFoundException } from "@nestjs/common";
import { MeetingClosingService } from "src/modules/chime-meeting-configuration/services";
import { findOneOrFail } from "src/common/utils";
import {
  AppointmentOrderQueryOptionsService,
  AppointmentOrderSharedLogicService,
} from "src/modules/appointment-orders/shared/services";
import { AUDIO_VIDEO_COMMUNICATION_TYPES } from "src/modules/appointments/shared/common/constants";
import { LokiLogger } from "src/common/logger";
import { OldGeneralPaymentsService } from "src/modules/payments/services";
import { AppointmentSharedService } from "src/modules/appointments/shared/services";
import { EAppointmentOrderErrorCodes } from "src/modules/appointment-orders/appointment-order/common/enum";

export class AppointmentOrderExpirationCancelService {
  private readonly lokiLogger = new LokiLogger(AppointmentOrderExpirationCancelService.name);

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(ChimeMeetingConfiguration)
    private readonly chimeMeetingConfigurationRepository: Repository<ChimeMeetingConfiguration>,
    @InjectRepository(AppointmentReminder)
    private readonly appointmentReminderRepository: Repository<AppointmentReminder>,
    private readonly meetingClosingService: MeetingClosingService,
    private readonly appointmentOrderQueryOptionsService: AppointmentOrderQueryOptionsService,
    private readonly appointmentOrderSharedLogicService: AppointmentOrderSharedLogicService,
    private readonly appointmentOrderNotificationService: AppointmentOrderNotificationService,
    private readonly appointmentSharedService: AppointmentSharedService,
    private readonly generalPaymentsService: OldGeneralPaymentsService,
  ) {}

  public async cancelExpiredAppointmentOrder(appointmentOrder: AppointmentOrder): Promise<void> {
    const appointmentId = appointmentOrder.appointment.id;
    const queryOptions = this.appointmentOrderQueryOptionsService.getCancelAppointmentBySystemOptions(appointmentId);
    const appointment = await findOneOrFail(appointmentId, this.appointmentRepository, queryOptions);

    const client = appointment.client;

    if (!client) {
      this.lokiLogger.error(`Client not found for Appointment with Id ${appointmentId}.`);
      throw new NotFoundException(EAppointmentOrderErrorCodes.CLIENT_NOT_FOUND_FOR_APPOINTMENT);
    }

    appointment.appointmentOrder = appointmentOrder;

    const { appointmentReminder, chimeMeetingConfiguration } = await this.processSingleAppointment(appointment);
    await this.deleteEntitiesBatch(appointmentReminder, this.appointmentReminderRepository);

    if (chimeMeetingConfiguration) {
      await this.deleteEntitiesBatch(chimeMeetingConfiguration, this.chimeMeetingConfigurationRepository);

      if (
        appointment.schedulingType === EAppointmentSchedulingType.ON_DEMAND &&
        AUDIO_VIDEO_COMMUNICATION_TYPES.includes(appointment.communicationType)
      ) {
        await this.meetingClosingService.deleteAwsChimeMeeting(chimeMeetingConfiguration);
      }
    }

    if (appointment.appointmentAdminInfo?.isRedFlagEnabled) {
      await this.appointmentSharedService.disableRedFlag(appointment);
    }

    await this.removeAppointmentOrders(appointmentOrder);
    await this.updateAppointmentStatusesBatch(appointmentId);
    await this.appointmentSharedService.removeLiveAppointmentCacheData(appointmentId);
    await this.appointmentOrderNotificationService.sendCanceledNotification(client, appointment.platformId, false, {
      appointmentId: appointmentId,
    });

    this.generalPaymentsService.cancelPayInAuth(appointment).catch((error: Error) => {
      this.lokiLogger.error(`Cancel appointment by system. Cancel payin error: ${error.message} `, error.stack);
    });
  }

  public async cancelExpiredGroupAppointmentOrders(appointmentOrderGroup: AppointmentOrderGroup): Promise<void> {
    const { platformId, sameInterpreter } = appointmentOrderGroup;

    const queryOptions = this.appointmentOrderQueryOptionsService.getCancelAppointmentOrderGroup(platformId);
    const appointments = await this.appointmentRepository.find(queryOptions);

    const firstAppointment = appointments[0];
    const client = firstAppointment.client;

    if (!client) {
      this.lokiLogger.error(`Client not found for Appointment with Id ${firstAppointment.id}.`);
      throw new NotFoundException(EAppointmentOrderErrorCodes.CLIENT_NOT_FOUND_FOR_APPOINTMENT);
    }

    const { appointmentsReminders, appointmentsChimeMeetings, appointmentOrders, appointmentsIds } =
      await this.collectEntitiesForDeletion(appointments);
    await this.deleteEntitiesBatch(appointmentsReminders, this.appointmentReminderRepository);

    if (appointmentsChimeMeetings.length > 0) {
      await this.deleteEntitiesBatch(appointmentsChimeMeetings, this.chimeMeetingConfigurationRepository);
    }

    if (appointments.some((appointment) => appointment.appointmentAdminInfo?.isRedFlagEnabled)) {
      await this.appointmentSharedService.disableRedFlag(appointments);
    }

    await this.removeAppointmentOrders(appointmentOrders);
    await this.updateAppointmentStatusesBatch(appointmentsIds);
    await this.removeOrderGroup(platformId);
    await this.appointmentOrderNotificationService.sendCanceledNotification(client, platformId, true, {
      appointmentsGroupId: platformId,
    });

    if (!sameInterpreter) {
      for (const appointment of appointments) {
        if (appointment.interpreter) {
          await this.appointmentOrderNotificationService.sendCanceledNotification(
            appointment.interpreter,
            appointment.platformId,
            false,
            { appointmentId: appointment.id },
          );
        } else {
          continue;
        }
      }
    }

    this.generalPaymentsService.cancelPayInAuthForGroup(appointments).catch((error: Error) => {
      this.lokiLogger.error(
        `Failed to cancel payin auth: ${error.message}, appointmentGroupId: ${appointments[0].appointmentsGroupId}`,
        error.stack,
      );
    });
  }

  private async collectEntitiesForDeletion(appointments: Appointment[]): Promise<{
    appointmentsReminders: AppointmentReminder[];
    appointmentsChimeMeetings: ChimeMeetingConfiguration[];
    appointmentOrders: AppointmentOrder[];
    appointmentsIds: string[];
  }> {
    const appointmentsReminders: AppointmentReminder[] = [];
    const appointmentsChimeMeetings: ChimeMeetingConfiguration[] = [];
    const appointmentOrders: AppointmentOrder[] = [];
    const appointmentsIds: string[] = [];

    for (const appointment of appointments) {
      const { appointmentReminder, chimeMeetingConfiguration, appointmentOrder, appointmentId } =
        await this.processSingleAppointment(appointment);

      appointmentsReminders.push(appointmentReminder);
      appointmentOrders.push(appointmentOrder);
      appointmentsIds.push(appointmentId);

      if (chimeMeetingConfiguration) {
        appointmentsChimeMeetings.push(chimeMeetingConfiguration);
      }
    }

    return { appointmentsReminders, appointmentsChimeMeetings, appointmentOrders, appointmentsIds };
  }

  private async processSingleAppointment(appointment: Appointment): Promise<{
    appointmentReminder: AppointmentReminder;
    chimeMeetingConfiguration: ChimeMeetingConfiguration | null;
    appointmentOrder: AppointmentOrder;
    appointmentId: string;
  }> {
    const {
      appointmentReminder,
      chimeMeetingConfiguration,
      appointmentOrder,
      id,
      alternativePlatform,
      communicationType,
    } = appointment;

    await this.ensureEntityExists(appointmentReminder, "AppointmentReminder", appointment.id);
    await this.ensureEntityExists(appointmentOrder, "AppointmentOrder", appointment.id);

    let validChimeMeetingConfiguration: ChimeMeetingConfiguration | null = null;

    if (!alternativePlatform && communicationType !== EAppointmentCommunicationType.FACE_TO_FACE) {
      await this.ensureEntityExists(chimeMeetingConfiguration, "ChimeMeetingConfiguration", appointment.id);

      validChimeMeetingConfiguration = chimeMeetingConfiguration;
    }

    return {
      appointmentReminder: appointmentReminder as AppointmentReminder,
      chimeMeetingConfiguration: validChimeMeetingConfiguration,
      appointmentOrder: appointmentOrder as AppointmentOrder,
      appointmentId: id,
    };
  }

  private async ensureEntityExists(
    entity: ObjectLiteral | null,
    entityName: string,
    appointmentId: string,
  ): Promise<void> {
    if (entity) {
      return;
    }

    this.lokiLogger.error(
      `Failed to cancel Appointment. ${entityName} is missing for Appointment with Id: ${appointmentId}.`,
    );
    throw new NotFoundException(EAppointmentOrderErrorCodes.ENTITY_MISSING_FOR_APPOINTMENT);
  }

  private async deleteEntitiesBatch<T extends ObjectLiteral>(
    entities: T | T[],
    repository: Repository<T>,
  ): Promise<void> {
    const entitiesArray = Array.isArray(entities) ? entities : [entities];

    if (entitiesArray.length === 0) {
      throw new NotFoundException(EAppointmentOrderErrorCodes.ENTITIES_NOT_FOUND_FOR_DELETION);
    }

    await repository.remove(entitiesArray);
  }

  private async updateAppointmentStatusesBatch(id: string | string[]): Promise<void> {
    await this.appointmentRepository.update(id, { status: EAppointmentStatus.CANCELLED_BY_SYSTEM });
  }

  private async removeAppointmentOrders(appointmentOrder: AppointmentOrder | AppointmentOrder[]): Promise<void> {
    await this.appointmentOrderSharedLogicService.removeAppointmentOrderBatch(appointmentOrder);
  }

  private async removeOrderGroup(platformId: string): Promise<void> {
    await this.appointmentOrderSharedLogicService.deleteAppointmentOrderGroupIfEmpty(platformId, true);
  }
}
