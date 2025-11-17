import { BadRequestException, Injectable } from "@nestjs/common";
import { Appointment } from "src/modules/appointments/appointment/entities";
import {
  CreateFaceToFaceAppointmentDto,
  CreateVirtualAppointmentDto,
} from "src/modules/appointments/appointment/common/dto";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Not, Repository } from "typeorm";
import { EAppointmentRecreationType } from "src/modules/appointments/appointment/common/enums";
import { AppointmentOrderCreateService } from "src/modules/appointment-orders/workflow/services";
import { AppointmentOrder, AppointmentOrderGroup } from "src/modules/appointment-orders/appointment-order/entities";
import { Channel } from "src/modules/chime-messaging-configuration/entities";
import { LokiLogger } from "src/common/logger";
import {
  AppointmentOrderQueryOptionsService,
  AppointmentOrderSharedLogicService,
} from "src/modules/appointment-orders/shared/services";
import { COMPLETED_APPOINTMENT_STATUSES } from "src/modules/appointments/shared/common/constants";
import { IRecreatedAppointmentWithOldAppointment } from "src/modules/appointments/appointment/common/interfaces";
import { UserRole } from "src/modules/users/entities";
import { IRecreateAppointmentOrderGroup } from "src/modules/appointment-orders/workflow/common/interfaces";
import { Address } from "src/modules/addresses/entities";
import { TCancelAppointment } from "src/modules/appointments/appointment/common/types";
import { EAppointmentOrderWorkflowErrorCodes } from "src/modules/appointment-orders/workflow/common/enums";
import { QueueInitializeService } from "src/modules/queues/services";
import { EPaymentOperation } from "src/modules/payments-analysis/common/enums/core";

@Injectable()
export class AppointmentOrderRecreationService {
  private readonly lokiLogger = new LokiLogger(AppointmentOrderRecreationService.name);

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,
    private readonly appointmentOrderQueryOptionsService: AppointmentOrderQueryOptionsService,
    private readonly appointmentOrderSharedLogicService: AppointmentOrderSharedLogicService,
    private readonly appointmentOrderCreateService: AppointmentOrderCreateService,
    private readonly queueInitializeService: QueueInitializeService,
  ) {}

  public async handleOrderRecreationForUpdatedAppointment(
    recreatedAppointmentsWithOldAppointments: IRecreatedAppointmentWithOldAppointment[],
    recreationType: EAppointmentRecreationType,
  ): Promise<void> {
    const triggerPayment = true;
    switch (recreationType) {
      case EAppointmentRecreationType.GROUP:
        await this.recreateFullOrderGroup(recreatedAppointmentsWithOldAppointments, triggerPayment);
        break;
      case EAppointmentRecreationType.SINGLE_IN_GROUP:
        await this.recreateOrderInGroup(recreatedAppointmentsWithOldAppointments[0], triggerPayment);
        break;
      default:
        await this.recreateIndividualOrder(recreatedAppointmentsWithOldAppointments[0], triggerPayment);
        break;
    }
  }

  public async handleOrderRecreationForCancelledAppointment(
    cancelledAppointment: TCancelAppointment,
    recreationType: EAppointmentRecreationType,
  ): Promise<void> {
    const appointment = cancelledAppointment as Appointment;
    const recreatedAppointmentWithOldAppointment: IRecreatedAppointmentWithOldAppointment = {
      recreatedAppointment: appointment,
      oldAppointment: appointment,
    };
    const triggerPayment = false;

    switch (recreationType) {
      case EAppointmentRecreationType.GROUP:
        await this.recreateFullOrderGroup([recreatedAppointmentWithOldAppointment], triggerPayment);
        break;
      case EAppointmentRecreationType.SINGLE_IN_GROUP:
        await this.recreateOrderInGroup(recreatedAppointmentWithOldAppointment, triggerPayment);
        break;
      default:
        await this.recreateIndividualOrder(recreatedAppointmentWithOldAppointment, triggerPayment);
        break;
    }
  }

  private async recreateFullOrderGroup(
    recreatedAppointmentsWithOldAppointments: IRecreatedAppointmentWithOldAppointment[],
    triggerPayment: boolean,
  ): Promise<void> {
    const { recreatedAppointment } = recreatedAppointmentsWithOldAppointments[0];

    if (!recreatedAppointment.appointmentsGroupId) {
      this.lokiLogger.error(`Appointment with id: ${recreatedAppointment.id} does not have appointmentsGroupId.`);
      throw new BadRequestException(EAppointmentOrderWorkflowErrorCodes.APPOINTMENT_MISSING_GROUP_ID);
    }

    const queryOptions = this.appointmentOrderQueryOptionsService.getFullGroupRecreationOptions(
      recreatedAppointment.appointmentsGroupId,
    );
    const appointmentGroup = (await this.appointmentRepository.find(queryOptions)) as IRecreateAppointmentOrderGroup[];

    const newAppointmentOrderGroup = await this.recreateOrderGroup(appointmentGroup);

    if (triggerPayment) {
      for (const appointmentGroup of recreatedAppointmentsWithOldAppointments) {
        const { recreatedAppointment, oldAppointment } = appointmentGroup;
        await this.queueInitializeService.addProcessPaymentOperationQueue(
          recreatedAppointment.id,
          EPaymentOperation.AUTHORIZATION_RECREATE_PAYMENT,
          { oldAppointmentId: oldAppointment.id },
        );
      }
    } else {
      await this.appointmentOrderSharedLogicService.triggerLaunchSearchForIndividualOrderGroup(
        newAppointmentOrderGroup.id,
      );
    }
  }

  private async recreateOrderInGroup(
    recreatedAppointmentWithOldAppointment: IRecreatedAppointmentWithOldAppointment,
    triggerPayment: boolean,
  ): Promise<void> {
    const { oldAppointment, recreatedAppointment } = recreatedAppointmentWithOldAppointment;

    if (!recreatedAppointment.appointmentsGroupId) {
      this.lokiLogger.error(`Appointment with id: ${recreatedAppointment.id} does not have appointmentsGroupId.`);
      throw new BadRequestException(EAppointmentOrderWorkflowErrorCodes.APPOINTMENT_MISSING_GROUP_ID);
    }

    const queryOptions = this.appointmentOrderQueryOptionsService.getPendingAppointmentsWithoutInterpreterOptions(
      recreatedAppointment.appointmentsGroupId,
    );
    const pendingAppointmentsWithoutInterpreter = (await this.appointmentRepository.find(
      queryOptions,
    )) as IRecreateAppointmentOrderGroup[];

    const newAppointmentOrderGroup = await this.recreateOrderGroup(pendingAppointmentsWithoutInterpreter);

    if (triggerPayment) {
      await this.queueInitializeService.addProcessPaymentOperationQueue(
        recreatedAppointment.id,
        EPaymentOperation.AUTHORIZATION_RECREATE_PAYMENT,
        { oldAppointmentId: oldAppointment.id },
      );
    } else {
      await this.appointmentOrderSharedLogicService.triggerLaunchSearchForIndividualOrderGroup(
        newAppointmentOrderGroup.id,
      );
    }
  }

  private async recreateIndividualOrder(
    recreatedAppointmentWithOldAppointment: IRecreatedAppointmentWithOldAppointment,
    triggerPayment: boolean,
  ): Promise<void> {
    const { oldAppointment, recreatedAppointment } = recreatedAppointmentWithOldAppointment;

    if (!recreatedAppointment.client) {
      this.lokiLogger.error(`No client in recreatedAppointment with id: ${recreatedAppointment.id}.`);
      throw new BadRequestException(EAppointmentOrderWorkflowErrorCodes.NO_CLIENT_IN_APPOINTMENT);
    }

    const appointmentOrder = (await this.appointmentOrderCreateService.constructAndCreateAppointmentOrder(
      recreatedAppointment,
      recreatedAppointment.client,
      recreatedAppointment.address as Address,
    )) as AppointmentOrder;

    if (triggerPayment) {
      await this.queueInitializeService.addProcessPaymentOperationQueue(
        recreatedAppointment.id,
        EPaymentOperation.AUTHORIZATION_RECREATE_PAYMENT,
        { oldAppointmentId: oldAppointment.id },
      );
    } else {
      await this.appointmentOrderSharedLogicService.triggerLaunchSearchForIndividualOrder(appointmentOrder.id);
    }
  }

  private async recreateOrderGroup(appointmentGroup: IRecreateAppointmentOrderGroup[]): Promise<AppointmentOrderGroup> {
    if (appointmentGroup.length === 0) {
      throw new BadRequestException(EAppointmentOrderWorkflowErrorCodes.NO_APPOINTMENTS_FOR_GROUP_RECREATION);
    }

    const appointmentWithOrder = appointmentGroup.find(
      (appointment) => appointment.appointmentOrder && appointment.appointmentOrder.appointmentOrderGroup,
    );

    if (appointmentWithOrder && appointmentWithOrder.appointmentOrder.appointmentOrderGroup) {
      await this.appointmentOrderSharedLogicService.removeGroupAndAssociatedOrders(
        appointmentWithOrder.appointmentOrder.appointmentOrderGroup,
      );
    }

    const [firstAppointment] = appointmentGroup;

    if (!firstAppointment.appointmentsGroupId || !firstAppointment.client) {
      this.lokiLogger.error(`Appointment with id ${firstAppointment.id} does not have appointmentsGroupId or client.`);
      throw new BadRequestException(EAppointmentOrderWorkflowErrorCodes.APPOINTMENT_MISSING_GROUP_ID_OR_CLIENT);
    }

    const appointmentDto = firstAppointment as unknown as CreateVirtualAppointmentDto | CreateFaceToFaceAppointmentDto;
    const newAppointmentOrderGroup = await this.appointmentOrderCreateService.constructAndCreateAppointmentOrderGroup(
      { ...appointmentDto },
      firstAppointment.client as UserRole,
    );

    for (const appointment of appointmentGroup) {
      await this.appointmentOrderCreateService.constructAndCreateAppointmentOrder(
        appointment as Appointment,
        firstAppointment.client as UserRole,
        appointment.address as Address,
        newAppointmentOrderGroup,
      );
    }

    await this.updateAppointmentsGroupId(firstAppointment.appointmentsGroupId, newAppointmentOrderGroup.platformId);
    await this.appointmentOrderCreateService.calculateTimeFramesForOrderGroup(
      newAppointmentOrderGroup.id,
      newAppointmentOrderGroup.platformId,
    );

    return newAppointmentOrderGroup;
  }

  private async updateAppointmentsGroupId(
    oldAppointmentsGroupId: string,
    newAppointmentGroupId: string,
  ): Promise<void> {
    await this.appointmentRepository.update(
      { appointmentsGroupId: oldAppointmentsGroupId, status: Not(In(COMPLETED_APPOINTMENT_STATUSES)) },
      { appointmentsGroupId: newAppointmentGroupId },
    );
    await this.channelRepository.update(
      { appointmentsGroupId: oldAppointmentsGroupId },
      { appointmentsGroupId: newAppointmentGroupId },
    );
  }
}
