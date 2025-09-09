import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { Repository } from "typeorm";
import { findOneOrFail } from "src/common/utils";
import { EAppointmentStatus } from "src/modules/appointments/appointment/common/enums";
import { ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import { AppointmentOrder, AppointmentOrderGroup } from "src/modules/appointment-orders/appointment-order/entities";
import { MessagingResolveService } from "src/modules/chime-messaging-configuration/services";
import { NotificationService } from "src/modules/notifications/services";
import { IAppointmentDetailsOutput } from "src/modules/appointments/appointment/common/outputs";
import { AppointmentSharedService } from "src/modules/appointments/shared/services";

@Injectable()
export class AppointmentFailedPaymentCancelService {
  private readonly logger = new Logger(AppointmentFailedPaymentCancelService.name);
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(ChimeMeetingConfiguration)
    private readonly chimeMeetingConfigurationRepository: Repository<ChimeMeetingConfiguration>,
    @InjectRepository(AppointmentOrder)
    private readonly appointmentOrderRepository: Repository<AppointmentOrder>,
    @InjectRepository(AppointmentOrderGroup)
    private readonly appointmentOrderGroupRepository: Repository<AppointmentOrderGroup>,
    private readonly appointmentSharedService: AppointmentSharedService,
    private readonly messagingResolveService: MessagingResolveService,
    private readonly notificationService: NotificationService,
  ) {}

  public async cancelAppointmentPaymentFailed(id: string): Promise<void> {
    const appointment = await findOneOrFail(id, this.appointmentRepository, {
      select: {
        id: true,
        status: true,
        platformId: true,
        interpreterId: true,
        appointmentReminder: { id: true },
        chimeMeetingConfiguration: { id: true },
        appointmentOrder: { id: true, appointmentOrderGroup: { id: true, appointmentOrders: { id: true } } },
        appointmentAdminInfo: { isRedFlagEnabled: true },
      },
      where: { id: id },
      relations: {
        appointmentReminder: true,
        chimeMeetingConfiguration: true,
        appointmentOrder: { appointmentOrderGroup: { appointmentOrders: true } },
        appointmentAdminInfo: true,
      },
    });
    await this.cleanupDataAndCancelAppointment(appointment);
  }

  public async cancelGroupAppointmentsPaymentFailed(appointmentsGroupId: string): Promise<void> {
    const appointments = await this.appointmentRepository.find({
      select: {
        id: true,
        status: true,
        platformId: true,
        interpreterId: true,
        appointmentReminder: { id: true },
        chimeMeetingConfiguration: { id: true },
        appointmentOrder: { id: true, appointmentOrderGroup: { id: true, appointmentOrders: { id: true } } },
        appointmentAdminInfo: { isRedFlagEnabled: true },
      },
      where: { appointmentsGroupId: appointmentsGroupId },
      relations: {
        appointmentReminder: true,
        chimeMeetingConfiguration: true,
        appointmentOrder: { appointmentOrderGroup: { appointmentOrders: true } },
        appointmentAdminInfo: true,
      },
    });

    for (const appointment of appointments) {
      await this.cleanupDataAndCancelAppointment(appointment);
    }
  }

  private async cleanupDataAndCancelAppointment(appointment: Appointment): Promise<void> {
    await this.appointmentRepository.update(appointment.id, { status: EAppointmentStatus.CANCELLED_ORDER });
    await this.appointmentSharedService.deleteAppointmentShortUrls(appointment.id);
    await this.appointmentSharedService.deleteAppointmentReminder(appointment.id);

    if (appointment.appointmentAdminInfo && appointment.appointmentAdminInfo.isRedFlagEnabled) {
      await this.appointmentSharedService.disableRedFlag(appointment);
    }

    if (appointment.appointmentOrder) {
      await this.handleOrderRemoval(appointment.appointmentOrder);
    }

    if (appointment.chimeMeetingConfiguration) {
      await this.chimeMeetingConfigurationRepository.remove(appointment.chimeMeetingConfiguration);
    }

    if (appointment.status === EAppointmentStatus.ACCEPTED) {
      await this.messagingResolveService.handleChannelResolveProcess(appointment.id);

      if (appointment.interpreterId) {
        await this.sendClientCanceledAppointmentNotification(appointment.interpreterId, appointment.platformId, {
          appointmentId: appointment.id,
        });
      }
    }
  }

  private async handleOrderRemoval(appointmentOrder: AppointmentOrder): Promise<void> {
    await this.appointmentOrderRepository.remove(appointmentOrder);

    const { appointmentOrderGroup } = appointmentOrder;

    if (!appointmentOrderGroup) {
      return;
    }

    const appointmentOrdersLeft = await this.appointmentOrderRepository.count({
      where: { appointmentOrderGroupId: appointmentOrderGroup.id },
    });

    if (appointmentOrdersLeft === 0) {
      await this.appointmentOrderGroupRepository.remove(appointmentOrderGroup);
    }
  }

  private async sendClientCanceledAppointmentNotification(
    interpreterId: string,
    platformId: string,
    appointmentDetails: IAppointmentDetailsOutput,
  ): Promise<void> {
    this.notificationService
      .sendClientCanceledAppointmentNotification(interpreterId, platformId, appointmentDetails)
      .catch((error) => {
        this.logger.error(
          `Failed to send single client canceled appointment notification for userRoleId: ${interpreterId}`,
          error,
        );
      });
  }
}
