import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LokiLogger } from "src/common/logger";
import { AppointmentOrder, AppointmentOrderGroup } from "src/modules/appointment-orders/appointment-order/entities";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { NotificationService } from "src/modules/notifications/services";
import { Repository } from "typeorm";
import { AppointmentOrderQueryOptionsService } from "src/modules/appointment-orders/shared/services";
import { BookingSlotManagementService } from "src/modules/booking-slot-management/services";
import { ICancelOnDemandInvitationOutput } from "src/modules/appointment-orders/appointment-order/common/outputs";
import {
  TCancelOnDemandCallsAppointmentOrder,
  TCheckIfInterpreterIsBlocked,
} from "src/modules/appointment-orders/shared/common/types";
import { InterpreterProfile } from "src/modules/interpreters/profile/entities";
import { findOneOrFail } from "src/common/utils";

@Injectable()
export class AppointmentOrderSharedLogicService {
  private readonly lokiLogger = new LokiLogger(AppointmentOrderSharedLogicService.name);

  constructor(
    @InjectRepository(AppointmentOrder)
    private readonly appointmentOrderRepository: Repository<AppointmentOrder>,
    @InjectRepository(AppointmentOrderGroup)
    private readonly appointmentOrderGroupRepository: Repository<AppointmentOrderGroup>,
    @InjectRepository(InterpreterProfile)
    private readonly interpreterProfileRepository: Repository<InterpreterProfile>,
    private readonly appointmentOrderQueryOptionsService: AppointmentOrderQueryOptionsService,
    private readonly bookingSlotManagementService: BookingSlotManagementService,
    private readonly notificationService: NotificationService,
  ) {}

  public async triggerLaunchSearchForIndividualOrder(id: string): Promise<void> {
    await this.appointmentOrderRepository.update(id, {
      isSearchNeeded: true,
    });
  }

  public async triggerLaunchSearchForIndividualOrderGroup(id: string): Promise<void> {
    await this.appointmentOrderGroupRepository.update(id, {
      isSearchNeeded: true,
    });
  }

  public async updateActiveOrderConditions(
    appointment: Appointment,
    orderUpdatePayload: Partial<AppointmentOrder>,
  ): Promise<void> {
    if (!appointment.isGroupAppointment) {
      if (!appointment.appointmentOrder) {
        throw new BadRequestException("Appointment Order cannot be updated because it missing in Appointment");
      }

      await this.appointmentOrderRepository.update({ id: appointment.appointmentOrder.id }, orderUpdatePayload);

      await this.triggerLaunchSearchForIndividualOrder(appointment.appointmentOrder.id);
    } else {
      const groupId = appointment.appointmentsGroupId;
      const appointmentOrderGroupId = appointment.appointmentOrder?.appointmentOrderGroup?.id;

      if (!groupId || !appointmentOrderGroupId) {
        throw new BadRequestException("Group appointments cannot be updated; missing group IDs");
      }

      await this.appointmentOrderRepository.update(
        { appointmentOrderGroup: { id: appointmentOrderGroupId } },
        orderUpdatePayload,
      );

      await this.triggerLaunchSearchForIndividualOrderGroup(appointmentOrderGroupId);
    }
  }

  public async removeGroupAndAssociatedOrders(appointmentOrderGroup: {
    id: string;
    appointmentOrders: { id: string }[];
  }): Promise<void> {
    if (!appointmentOrderGroup) {
      throw new NotFoundException(`Appointment order group not found.`);
    }

    await this.removeAppointmentOrderBatch(appointmentOrderGroup.appointmentOrders);
    await this.deleteAppointmentOrderGroupIfEmpty(appointmentOrderGroup.id);
  }

  public async deleteAppointmentOrderGroupIfEmpty(id: string, isPlatform: boolean = false): Promise<void> {
    const queryOptions = this.appointmentOrderQueryOptionsService.getDeleteAppointmentOrderGroupOptions(id, isPlatform);
    const appointmentOrderGroup = await this.appointmentOrderGroupRepository.findOne(queryOptions);

    if (appointmentOrderGroup && appointmentOrderGroup.appointmentOrders.length === 0) {
      await this.appointmentOrderGroupRepository.remove(appointmentOrderGroup);
    }
  }

  //  TODO: Refactor O
  public async removeAppointmentOrderBatch(appointmentOrder: { id: string } | { id: string }[]): Promise<void> {
    if (Array.isArray(appointmentOrder)) {
      if (appointmentOrder.length === 0) {
        throw new NotFoundException(`Appointment order not found.`);
      }

      await this.appointmentOrderRepository.remove(appointmentOrder as AppointmentOrder[]);
    } else {
      if (!appointmentOrder) {
        throw new NotFoundException(`Appointment order not found.`);
      }

      await this.appointmentOrderRepository.remove(appointmentOrder as AppointmentOrder);
    }
  }

  public async cancelOnDemandCalls(
    appointmentOrder: TCancelOnDemandCallsAppointmentOrder,
    interpreterId?: string,
  ): Promise<void> {
    const { platformId, matchedInterpreterIds, appointment } = appointmentOrder;
    const updatedInterpreterIds = matchedInterpreterIds.filter((id) => id !== interpreterId).sort();

    for (const otherInterpreterId of updatedInterpreterIds) {
      await this.sendCanceledOnDemandCallNotification(otherInterpreterId, platformId, {
        appointmentId: appointment.id,
      });
    }
  }

  public async sendCanceledOnDemandCallNotification(
    clientId: string,
    platformId: string,
    cancelOnDemandInvitation: ICancelOnDemandInvitationOutput,
  ): Promise<void> {
    this.notificationService
      .sendCancelOnDemandInvitationForAppointmentNotification(clientId, platformId, cancelOnDemandInvitation)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send accepted appointment notification for userRoleId: ${clientId}`,
          error.stack,
        );
      });
  }

  public async checkIfInterpreterIsBlocked(interpreter: TCheckIfInterpreterIsBlocked): Promise<void> {
    if (!interpreter.interpreterProfile) {
      throw new BadRequestException("Interpreter profile not found.");
    }

    if (interpreter.interpreterProfile.isTemporaryBlocked) {
      throw new BadRequestException("This profile is temporarily blocked, please wait when block will be removed.");
    }

    return;
  }

  public async getConflictingAppointmentsBeforeAccept(
    interpreterId: string,
    appointments: { scheduledStartTime: Date; scheduledEndTime: Date }[],
  ): Promise<Appointment[]> {
    if (appointments.length === 1) {
      return this.bookingSlotManagementService.findConflictingAppointmentsBeforeAccept(
        interpreterId,
        appointments[0].scheduledStartTime,
        appointments[0].scheduledEndTime,
      );
    }

    return this.bookingSlotManagementService.findConflictingAppointmentGroupBeforeAccept(interpreterId, appointments);
  }

  public async makeOfflineInterpreterBeforeOnDemand(interpreterId: string): Promise<void> {
    await this.interpreterProfileRepository.update(
      { userRole: { id: interpreterId } },
      {
        isOnlineForAudio: false,
        isOnlineForVideo: false,
        isOnlineForFaceToFace: false,
      },
    );
  }

  public async makeOnlineInterpreterAfterOnDemand(interpreterId: string): Promise<void> {
    const interpreterProfile = await findOneOrFail(interpreterId, this.interpreterProfileRepository, {
      select: {
        id: true,
        audioOnDemandSetting: true,
        videoOnDemandSetting: true,
        faceToFaceOnDemandSetting: true,
      },
      where: { userRole: { id: interpreterId } },
    });

    const interpreterUpdatePayload: Partial<InterpreterProfile> = {};

    if (interpreterProfile.audioOnDemandSetting) {
      interpreterUpdatePayload.isOnlineForAudio = true;
    }

    if (interpreterProfile.videoOnDemandSetting) {
      interpreterUpdatePayload.isOnlineForVideo = true;
    }

    if (interpreterProfile.faceToFaceOnDemandSetting) {
      interpreterUpdatePayload.isOnlineForFaceToFace = true;
    }

    await this.interpreterProfileRepository.update(interpreterProfile.id, interpreterUpdatePayload);
  }
}
