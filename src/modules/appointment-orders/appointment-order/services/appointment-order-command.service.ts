import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AppointmentOrder, AppointmentOrderGroup } from "src/modules/appointment-orders/appointment-order/entities";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { AppointmentCancelService, AppointmentCommandService } from "src/modules/appointments/appointment/services";
import { UserRole } from "src/modules/users/entities";
import { Repository } from "typeorm";
import { AppointmentOrderNotificationService } from "src/modules/appointment-orders/appointment-order/services";
import {
  AppointmentOrderQueryOptionsService,
  AppointmentOrderSharedLogicService,
} from "src/modules/appointment-orders/shared/services";
import { findOneOrFail } from "src/common/utils";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { IMessageOutput } from "src/common/outputs";
import {
  AcceptAppointmentDto,
  SendRepeatNotificationDto,
} from "src/modules/appointment-orders/appointment-order/common/dto";
import { DEFAULT_INTERPRETER_CANCELLATION_REASON } from "src/common/constants";
import { EAppointmentSchedulingType } from "src/modules/appointments/appointment/common/enums";
import { IJoinMeetingOutput } from "src/modules/chime-meeting-configuration/common/outputs";
import {
  TAcceptAppointmentOrder,
  TAcceptAppointmentOrderGroup,
} from "src/modules/appointment-orders/appointment-order/common/types";

@Injectable()
export class AppointmentOrderCommandService {
  constructor(
    @InjectRepository(AppointmentOrder)
    private readonly appointmentOrderRepository: Repository<AppointmentOrder>,
    @InjectRepository(AppointmentOrderGroup)
    private readonly appointmentOrderGroupRepository: Repository<AppointmentOrderGroup>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly appointmentCommandService: AppointmentCommandService,
    private readonly appointmentCancelService: AppointmentCancelService,
    private readonly appointmentOrderQueryOptionsService: AppointmentOrderQueryOptionsService,
    private readonly appointmentOrderNotificationService: AppointmentOrderNotificationService,
    private readonly appointmentOrderSharedLogicService: AppointmentOrderSharedLogicService,
  ) {}

  public async acceptAppointmentOrder(
    id: string,
    user: ITokenUserData,
    dto?: AcceptAppointmentDto,
  ): Promise<IMessageOutput> {
    const interpreterOptions = this.appointmentOrderQueryOptionsService.getInterpreterOptions(user.userRoleId);
    const interpreter = await findOneOrFail(user.userRoleId, this.userRoleRepository, interpreterOptions);
    await this.appointmentOrderSharedLogicService.checkIfInterpreterIsBlocked(interpreter);

    const queryOptions = this.appointmentOrderQueryOptionsService.getAppointmentOrderOptions(id);
    const appointmentOrder = (await findOneOrFail(
      id,
      this.appointmentOrderRepository,
      queryOptions,
    )) as TAcceptAppointmentOrder;

    if (!appointmentOrder.appointment.clientId) {
      throw new NotFoundException(`Client not found in Appointment Order with Id: ${id}.`);
    }

    if (appointmentOrder.appointmentOrderGroup && appointmentOrder.appointmentOrderGroup.sameInterpreter) {
      throw new BadRequestException("Cannot accept a single order. The entire appointment group must be accepted.");
    }

    await this.checkConflictingAppointmentsBeforeAccept(user, [appointmentOrder.appointment], dto?.ignoreConflicts);

    await this.appointmentOrderSharedLogicService.removeAppointmentOrderBatch(appointmentOrder);
    const acceptedAppointment = await this.appointmentCommandService.acceptAppointment(appointmentOrder, interpreter);
    await this.appointmentOrderNotificationService.sendAcceptedOrderNotification(
      appointmentOrder.appointment.clientId,
      appointmentOrder.appointment.platformId,
      { appointmentId: appointmentOrder.appointment.id },
    );

    if (appointmentOrder.appointmentOrderGroup) {
      await this.appointmentOrderSharedLogicService.deleteAppointmentOrderGroupIfEmpty(
        appointmentOrder.appointmentOrderGroup.id,
      );
    }

    return acceptedAppointment as IMessageOutput;
  }

  public async acceptAppointmentOnDemandOrder(id: string, user: ITokenUserData): Promise<IJoinMeetingOutput> {
    const interpreterOptions = this.appointmentOrderQueryOptionsService.getInterpreterOptions(user.userRoleId);
    const interpreter = await findOneOrFail(user.userRoleId, this.userRoleRepository, interpreterOptions);
    await this.appointmentOrderSharedLogicService.checkIfInterpreterIsBlocked(interpreter);

    const appointmentOrderOptions = this.appointmentOrderQueryOptionsService.getAppointmentOrderOptions(id);
    const appointmentOrder = (await findOneOrFail(
      id,
      this.appointmentOrderRepository,
      appointmentOrderOptions,
    )) as TAcceptAppointmentOrder;

    if (!appointmentOrder.appointment.clientId) {
      throw new NotFoundException(`Client not found in Appointment Order with Id: ${id}.`);
    }

    await this.appointmentOrderSharedLogicService.removeAppointmentOrderBatch(appointmentOrder);
    const acceptedAppointment = await this.appointmentCommandService.acceptAppointment(appointmentOrder, interpreter);
    await this.appointmentOrderNotificationService.sendAcceptedOrderNotification(
      appointmentOrder.appointment.clientId,
      appointmentOrder.platformId,
      { appointmentId: appointmentOrder.appointment.id },
    );
    await this.appointmentOrderSharedLogicService.makeOfflineInterpreterBeforeOnDemand(interpreter.id);
    await this.appointmentOrderSharedLogicService.cancelOnDemandCalls(appointmentOrder, interpreter.id);

    return acceptedAppointment as IJoinMeetingOutput;
  }

  public async acceptAppointmentOrderGroup(
    id: string,
    user: ITokenUserData,
    dto?: AcceptAppointmentDto,
  ): Promise<{
    message: string;
  }> {
    const interpreterOptions = this.appointmentOrderQueryOptionsService.getInterpreterOptions(user.userRoleId);
    const interpreter = await findOneOrFail(user.userRoleId, this.userRoleRepository, interpreterOptions);
    await this.appointmentOrderSharedLogicService.checkIfInterpreterIsBlocked(interpreter);

    const queryOptions = this.appointmentOrderQueryOptionsService.getAppointmentOrderGroupOptions(id);
    const appointmentOrderGroup = (await findOneOrFail(
      id,
      this.appointmentOrderGroupRepository,
      queryOptions,
    )) as TAcceptAppointmentOrderGroup;

    if (appointmentOrderGroup.appointmentOrders.length === 0) {
      throw new NotFoundException(`No appointment orders found in Appointment Order Group with Id: ${id}.`);
    }

    if (!appointmentOrderGroup.appointmentOrders[0].appointment.clientId) {
      throw new NotFoundException(`Client not found in Appointment Order with Id: ${id}.`);
    }

    const appointments = appointmentOrderGroup.appointmentOrders.map((order) => order.appointment);
    await this.checkConflictingAppointmentsBeforeAccept(user, appointments, dto?.ignoreConflicts);

    await this.appointmentOrderNotificationService.sendAcceptedGroupNotification(
      appointmentOrderGroup.appointmentOrders[0].appointment.clientId,
      appointmentOrderGroup.platformId,
      { appointmentsGroupId: appointmentOrderGroup.platformId },
    );

    for (const appointmentOrder of appointmentOrderGroup.appointmentOrders) {
      await this.appointmentCommandService.acceptAppointment(appointmentOrder, interpreter);
    }

    if (appointmentOrderGroup) {
      await this.appointmentOrderSharedLogicService.removeGroupAndAssociatedOrders(appointmentOrderGroup);
    }

    return {
      message: "Appointment order group accepted successfully.",
    };
  }

  public async rejectAppointmentOrder(
    id: string,
    user: ITokenUserData,
  ): Promise<{
    message: string;
  }> {
    const interpreterOptions = this.appointmentOrderQueryOptionsService.getInterpreterOptions(user.userRoleId);
    const interpreter = await findOneOrFail(user.userRoleId, this.userRoleRepository, interpreterOptions);

    const queryOptions = this.appointmentOrderQueryOptionsService.getRejectAppointmentOrderOptions(id, interpreter.id);
    const appointmentOrder = await findOneOrFail(id, this.appointmentOrderRepository, queryOptions);

    const updatedMatchedInterpreterIds = appointmentOrder.matchedInterpreterIds.filter(
      (interpreterId) => interpreterId !== interpreter.id,
    );
    const updatedRejectedInterpreterIds = [...appointmentOrder.rejectedInterpreterIds, interpreter.id];

    await this.appointmentOrderRepository.update(appointmentOrder.id, {
      matchedInterpreterIds: updatedMatchedInterpreterIds,
      rejectedInterpreterIds: updatedRejectedInterpreterIds,
    });

    return {
      message: "Appointment order rejected successfully.",
    };
  }

  public async rejectAppointmentOrderGroup(
    id: string,
    user: ITokenUserData,
  ): Promise<{
    message: string;
  }> {
    const interpreterOptions = this.appointmentOrderQueryOptionsService.getInterpreterOptions(user.userRoleId);
    const interpreter = await findOneOrFail(user.userRoleId, this.userRoleRepository, interpreterOptions);

    const queryOptions = this.appointmentOrderQueryOptionsService.getRejectAppointmentOrderGroupOptions(
      id,
      interpreter.id,
    );
    const appointmentOrderGroup = await findOneOrFail(id, this.appointmentOrderGroupRepository, queryOptions);

    const updatedMatchedInterpreterIds = appointmentOrderGroup.matchedInterpreterIds.filter(
      (interpreterId) => interpreterId !== interpreter.id,
    );
    const updatedRejectedInterpreterIds = [...appointmentOrderGroup.rejectedInterpreterIds, interpreter.id];

    await this.appointmentOrderGroupRepository.update(appointmentOrderGroup.id, {
      matchedInterpreterIds: updatedMatchedInterpreterIds,
      rejectedInterpreterIds: updatedRejectedInterpreterIds,
    });

    return {
      message: "Appointment order group rejected successfully.",
    };
  }

  public async refuseAppointmentOrder(id: string, user: ITokenUserData): Promise<void> {
    const interpreterOptions = this.appointmentOrderQueryOptionsService.getInterpreterOptions(user.userRoleId);
    const interpreter = await findOneOrFail(user.userRoleId, this.userRoleRepository, interpreterOptions);

    const queryOptions = this.appointmentOrderQueryOptionsService.getRefuseAppointmentOrderOptions(id, interpreter.id);
    const appointmentOrder = await findOneOrFail(id, this.appointmentOrderRepository, queryOptions);

    const updatedRejectedInterpreterIds = appointmentOrder.rejectedInterpreterIds.filter(
      (interpreterId) => interpreterId !== interpreter.id,
    );

    await this.appointmentOrderRepository.update(appointmentOrder.id, {
      rejectedInterpreterIds: updatedRejectedInterpreterIds,
    });

    return;
  }

  public async refuseAppointmentOrderGroup(id: string, user: ITokenUserData): Promise<void> {
    const interpreterOptions = this.appointmentOrderQueryOptionsService.getInterpreterOptions(user.userRoleId);
    const interpreter = await findOneOrFail(user.userRoleId, this.userRoleRepository, interpreterOptions);

    const queryOptions = this.appointmentOrderQueryOptionsService.getRefuseAppointmentOrderGroupOptions(
      id,
      interpreter.id,
    );
    const appointmentOrderGroup = await findOneOrFail(id, this.appointmentOrderGroupRepository, queryOptions);

    const updatedRejectedInterpreterIds = appointmentOrderGroup.rejectedInterpreterIds.filter(
      (interpreterId) => interpreterId !== interpreter.id,
    );

    await this.appointmentOrderGroupRepository.update(appointmentOrderGroup.id, {
      rejectedInterpreterIds: updatedRejectedInterpreterIds,
    });

    return;
  }

  public async sendRepeatNotificationToInterpreters(
    id: string,
    dto: SendRepeatNotificationDto,
  ): Promise<IMessageOutput> {
    const queryOptions = this.appointmentOrderQueryOptionsService.getSharedOrderForRepeatAndAddInterpreterOptions(id);
    const appointmentOrder = await findOneOrFail(id, this.appointmentOrderRepository, queryOptions);

    if (appointmentOrder.schedulingType === EAppointmentSchedulingType.ON_DEMAND) {
      throw new BadRequestException("The appointment on-demand scheduling type is not repeatable.");
    }

    if (dto.interpreterRoleId) {
      await this.checkIfInterpreterExistsInOrder(appointmentOrder.matchedInterpreterIds, dto.interpreterRoleId);
      await this.appointmentOrderNotificationService.sendRepeatSingleNotification(
        dto.interpreterRoleId,
        appointmentOrder.platformId,
        { appointmentOrderId: appointmentOrder.id },
      );

      return { message: "Notification sent successfully" };
    } else {
      for (const interpreterId of appointmentOrder.matchedInterpreterIds) {
        await this.appointmentOrderNotificationService.sendRepeatSingleNotification(
          interpreterId,
          appointmentOrder.platformId,
          {
            appointmentOrderId: appointmentOrder.id,
          },
        );
      }

      return { message: "Notifications sent successfully" };
    }
  }

  public async sendRepeatNotificationToInterpretersGroup(
    platformId: string,
    dto: SendRepeatNotificationDto,
  ): Promise<IMessageOutput> {
    const queryOptions = this.appointmentOrderQueryOptionsService.getOrderGroupRepeatNotificationOptions(platformId);

    const appointmentOrderGroup = await findOneOrFail(
      platformId,
      this.appointmentOrderGroupRepository,
      queryOptions,
      "platformId",
    );

    if (dto.interpreterRoleId) {
      await this.checkIfInterpreterExistsInOrder(appointmentOrderGroup.matchedInterpreterIds, dto.interpreterRoleId);
      await this.appointmentOrderNotificationService.sendRepeatGroupNotification(
        dto.interpreterRoleId,
        appointmentOrderGroup.platformId,
        { appointmentOrderGroupId: appointmentOrderGroup.id },
      );

      return { message: "Notification sent successfully" };
    } else {
      for (const interpreterId of appointmentOrderGroup.matchedInterpreterIds) {
        await this.appointmentOrderNotificationService.sendRepeatGroupNotification(
          interpreterId,
          appointmentOrderGroup.platformId,
          {
            appointmentOrderGroupId: appointmentOrderGroup.id,
          },
        );
      }

      return { message: "Notifications sent successfully" };
    }
  }

  private async checkIfInterpreterExistsInOrder(matchedInterpreterIds: string[], interpreterId: string): Promise<void> {
    if (!matchedInterpreterIds.includes(interpreterId)) {
      throw new BadRequestException("Interpreter not added. Please add interpreter first.");
    }

    return;
  }

  private async checkConflictingAppointmentsBeforeAccept(
    interpreter: ITokenUserData,
    appointments: { scheduledStartTime: Date; scheduledEndTime: Date }[],
    ignoreConflicts: boolean | undefined,
  ): Promise<void> {
    const conflictingAppointments =
      await this.appointmentOrderSharedLogicService.getConflictingAppointmentsBeforeAccept(
        interpreter.userRoleId,
        appointments,
      );

    if (conflictingAppointments.length === 0) {
      return;
    }

    if (!ignoreConflicts) {
      throw new BadRequestException({
        message: "The time you have selected is already reserved.",
        conflictingAppointments: conflictingAppointments,
      });
    }

    await this.cancelAllConflictingAppointments(interpreter, conflictingAppointments);
  }

  private async cancelAllConflictingAppointments(
    interpreter: ITokenUserData,
    conflictingAppointments: Appointment[],
  ): Promise<void> {
    const singleAppointments = conflictingAppointments.filter((appointment) => !appointment.isGroupAppointment);
    const groupAppointmentsDifferentInterpreter = conflictingAppointments.filter(
      (appointment) => appointment.isGroupAppointment && !appointment.sameInterpreter,
    );
    const groupAppointmentsSameInterpreter = conflictingAppointments.filter(
      (appointment) => appointment.isGroupAppointment && appointment.sameInterpreter,
    );

    if (singleAppointments.length > 0) {
      await this.cancelSingleAppointments(singleAppointments, interpreter);
    }

    if (groupAppointmentsDifferentInterpreter.length > 0) {
      await this.cancelSingleAppointments(groupAppointmentsDifferentInterpreter, interpreter);
    }

    if (groupAppointmentsSameInterpreter.length > 0) {
      await this.cancelGroupAppointmentsSameInterpreter(groupAppointmentsSameInterpreter, interpreter);
    }
  }

  private async cancelSingleAppointments(appointments: Appointment[], interpreter: ITokenUserData): Promise<void> {
    for (const appointment of appointments) {
      await this.appointmentCancelService.cancelAppointment(appointment.id, interpreter, {
        cancellationReason: DEFAULT_INTERPRETER_CANCELLATION_REASON,
      });
    }
  }

  private async cancelGroupAppointmentsSameInterpreter(
    appointments: Appointment[],
    interpreter: ITokenUserData,
  ): Promise<void> {
    const uniqueGroupIds: Set<string> = new Set(
      appointments
        .map((appointment) => appointment.appointmentsGroupId)
        .filter((appointmentsGroupId): appointmentsGroupId is string => appointmentsGroupId !== null),
    );

    for (const appointmentsGroupId of uniqueGroupIds) {
      await this.appointmentCancelService.cancelGroupAppointments(appointmentsGroupId, interpreter, {
        cancellationReason: DEFAULT_INTERPRETER_CANCELLATION_REASON,
      });
    }
  }
}
