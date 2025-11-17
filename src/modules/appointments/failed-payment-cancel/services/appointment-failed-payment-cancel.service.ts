import { Injectable } from "@nestjs/common";
import { Appointment, AppointmentAdminInfo, AppointmentReminder } from "src/modules/appointments/appointment/entities";
import { EntityManager } from "typeorm";
import { findManyTyped, findOneOrFailTyped } from "src/common/utils";
import { EAppointmentStatus } from "src/modules/appointments/appointment/common/enums";
import { ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import { AppointmentOrder, AppointmentOrderGroup } from "src/modules/appointment-orders/appointment-order/entities";
import { MessagingResolveService } from "src/modules/chime-messaging-configuration/services";
import { ShortUrl } from "src/modules/url-shortener/entities";
import { AppointmentNotificationService } from "src/modules/appointments/shared/services";
import {
  CancelAppointmentPaymentFailedQuery,
  TCancelAppointmentPaymentFailed,
  THandleOrderRemoval,
} from "src/modules/appointments/failed-payment-cancel/common/types";

@Injectable()
export class AppointmentFailedPaymentCancelService {
  constructor(
    private readonly appointmentNotificationService: AppointmentNotificationService,
    private readonly messagingResolveService: MessagingResolveService,
  ) {}

  public async cancelAppointmentPaymentFailed(manager: EntityManager, id: string): Promise<void> {
    const appointment = await findOneOrFailTyped<TCancelAppointmentPaymentFailed>(
      id,
      manager.getRepository(Appointment),
      {
        select: CancelAppointmentPaymentFailedQuery.select,
        where: { id },
        relations: CancelAppointmentPaymentFailedQuery.relations,
      },
    );
    await this.cleanupDataAndCancelAppointment(manager, appointment);
  }

  public async cancelGroupAppointmentsPaymentFailed(
    manager: EntityManager,
    appointmentsGroupId: string,
  ): Promise<void> {
    const appointments = await findManyTyped<TCancelAppointmentPaymentFailed[]>(manager.getRepository(Appointment), {
      select: CancelAppointmentPaymentFailedQuery.select,
      where: { appointmentOrderGroup: { id: appointmentsGroupId } },
      relations: CancelAppointmentPaymentFailedQuery.relations,
    });

    for (const appointment of appointments) {
      await this.cleanupDataAndCancelAppointment(manager, appointment);
    }
  }

  private async cleanupDataAndCancelAppointment(
    manager: EntityManager,
    appointment: TCancelAppointmentPaymentFailed,
  ): Promise<void> {
    await this.setAppointmentStatusToCancelledBySystem(manager, appointment.id);
    await this.deleteAppointmentShortUrls(manager, appointment.id);
    await this.deleteAppointmentReminder(manager, appointment.id);

    if (appointment.appointmentAdminInfo && appointment.appointmentAdminInfo.isRedFlagEnabled) {
      await this.disableRedFlag(manager, appointment.appointmentAdminInfo.id);
    }

    if (appointment.appointmentOrder) {
      await this.handleOrderRemoval(manager, appointment.appointmentOrder);
    }

    if (appointment.chimeMeetingConfiguration) {
      await this.removeChimeMeetingConfiguration(manager, appointment.chimeMeetingConfiguration);
    }

    if (appointment.status === EAppointmentStatus.ACCEPTED) {
      await this.messagingResolveService.handleChannelResolveProcess(appointment.id);

      if (appointment.interpreter) {
        await this.appointmentNotificationService.sendClientCanceledAppointmentNotification(
          appointment.interpreter,
          appointment.platformId,
          false,
          { appointmentId: appointment.id },
          appointment.isGroupAppointment,
        );
      }
    }
  }

  private async setAppointmentStatusToCancelledBySystem(manager: EntityManager, id: string): Promise<void> {
    await manager.getRepository(Appointment).update(id, { status: EAppointmentStatus.CANCELLED_BY_SYSTEM });
  }

  private async deleteAppointmentShortUrls(manager: EntityManager, appointmentId: string): Promise<void> {
    await manager.getRepository(ShortUrl).delete({ appointment: { id: appointmentId } });
  }

  private async deleteAppointmentReminder(manager: EntityManager, appointmentId: string): Promise<void> {
    await manager.getRepository(AppointmentReminder).delete({ appointment: { id: appointmentId } });
  }

  public async disableRedFlag(manager: EntityManager, appointmentAdminInfoId: string): Promise<void> {
    await manager
      .getRepository(AppointmentAdminInfo)
      .update({ id: appointmentAdminInfoId }, { isRedFlagEnabled: false });
  }

  private async removeChimeMeetingConfiguration(
    manager: EntityManager,
    chimeMeetingConfiguration: TCancelAppointmentPaymentFailed["chimeMeetingConfiguration"],
  ): Promise<void> {
    await manager
      .getRepository(ChimeMeetingConfiguration)
      .remove(chimeMeetingConfiguration as ChimeMeetingConfiguration);
  }

  private async handleOrderRemoval(manager: EntityManager, appointmentOrder: THandleOrderRemoval): Promise<void> {
    const appointmentOrderRepository = manager.getRepository(AppointmentOrder);
    const appointmentOrderGroupRepository = manager.getRepository(AppointmentOrderGroup);

    await appointmentOrderRepository.remove(appointmentOrder as AppointmentOrder);

    const { appointmentOrderGroup } = appointmentOrder;

    if (!appointmentOrderGroup) {
      return;
    }

    const appointmentOrdersLeft = await appointmentOrderRepository.count({
      where: { appointmentOrderGroupId: appointmentOrderGroup.id },
    });

    if (appointmentOrdersLeft === 0) {
      await appointmentOrderGroupRepository.remove(appointmentOrderGroup as AppointmentOrderGroup);
    }
  }
}
