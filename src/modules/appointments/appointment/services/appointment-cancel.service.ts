import { InjectRepository } from "@nestjs/typeorm";
import { Appointment, AppointmentCancellationInfo } from "src/modules/appointments/appointment/entities";
import { BadRequestException, Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { CancelAppointmentDto } from "src/modules/appointments/appointment/common/dto";
import {
  EAppointmentErrorCodes,
  EAppointmentRecreationType,
  EAppointmentStatus,
} from "src/modules/appointments/appointment/common/enums";
import { AppointmentOrderRecreationService } from "src/modules/appointment-orders/workflow/services";
import { ICreateAppointmentCancellationInfo } from "src/modules/appointments/appointment/common/interfaces";
import { AppointmentCommandService } from "src/modules/appointments/appointment/services";
import { AttendeeManagementService } from "src/modules/chime-meeting-configuration/services";
import { MessagingResolveService } from "src/modules/chime-messaging-configuration/services";
import { HelperService } from "src/modules/helper/services";
import { findOneOrFail, findOneOrFailTyped, isInRoles } from "src/common/utils";
import {
  AppointmentNotificationService,
  AppointmentQueryOptionsService,
  AppointmentSharedService,
} from "src/modules/appointments/shared/services";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { IMessageOutput } from "src/common/outputs";
import { ADMIN_ROLES, CLIENT_ROLES, INTERPRETER_ROLES } from "src/common/constants";
import { LokiLogger } from "src/common/logger";
import { AppointmentOrderSharedLogicService } from "src/modules/appointment-orders/shared/services";
import { UserRole } from "src/modules/users/entities";
import { InterpreterCancellationRecordService } from "src/modules/interpreters/profile/services";
import { TCancelAppointment } from "src/modules/appointments/appointment/common/types";
import { IAppointmentDetailsOutput } from "src/modules/appointments/appointment/common/outputs";
import { QueueInitializeService } from "src/modules/queues/services";
import { EPaymentOperation } from "src/modules/payments-analysis/common/enums/core";

@Injectable()
export class AppointmentCancelService {
  private readonly lokiLogger = new LokiLogger(AppointmentCancelService.name);
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(AppointmentCancellationInfo)
    private readonly appointmentCancellationInfoRepository: Repository<AppointmentCancellationInfo>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly appointmentQueryOptionsService: AppointmentQueryOptionsService,
    private readonly appointmentsCommandService: AppointmentCommandService,
    private readonly appointmentOrderSharedLogicService: AppointmentOrderSharedLogicService,
    private readonly appointmentNotificationService: AppointmentNotificationService,
    private readonly appointmentSharedService: AppointmentSharedService,
    private readonly appointmentOrderRecreationService: AppointmentOrderRecreationService,
    private readonly messagingResolveService: MessagingResolveService,
    private readonly attendeeManagementService: AttendeeManagementService,
    private readonly helperService: HelperService,
    private readonly interpreterCancellationRecordService: InterpreterCancellationRecordService,
    private readonly queueInitializeService: QueueInitializeService,
  ) {}

  public async cancelAppointment(id: string, user: ITokenUserData, dto: CancelAppointmentDto): Promise<IMessageOutput> {
    const queryOptions = this.appointmentQueryOptionsService.getCancelAppointmentOptions(id);
    const appointment = (await findOneOrFail(id, this.appointmentRepository, queryOptions)) as TCancelAppointment;

    this.appointmentSharedService.validateCancellationRequest(appointment, user, dto);

    const isFullGroupCancellation = false;

    if (isInRoles(CLIENT_ROLES, user.role)) {
      await this.cancelAppointmentByClient(appointment, isFullGroupCancellation);
    } else if (isInRoles(INTERPRETER_ROLES, user.role)) {
      await this.cancelAppointmentByInterpreter(appointment, user, isFullGroupCancellation);
    } else if (isInRoles(ADMIN_ROLES, user.role)) {
      await this.cancelAppointmentByAdmin(appointment, isFullGroupCancellation);
    }

    await this.finalizeCancellationWorkflow(appointment, user, dto);

    return { message: "Appointment cancelled successfully." };
  }

  public async cancelGroupAppointments(
    appointmentsGroupId: string,
    user: ITokenUserData,
    dto: CancelAppointmentDto,
  ): Promise<IMessageOutput> {
    const queryOptions = this.appointmentQueryOptionsService.getCancelGroupAppointmentsOptions(appointmentsGroupId);
    const appointments = (await this.appointmentRepository.find(queryOptions)) as TCancelAppointment[];

    if (appointments.length === 0) {
      throw new BadRequestException(EAppointmentErrorCodes.NO_APPOINTMENTS_TO_CANCEL_IN_GROUP);
    }

    const isFullGroupCancellation = true;

    if (isInRoles(CLIENT_ROLES, user.role)) {
      await this.cancelAppointmentsByClient(appointments, user, dto, isFullGroupCancellation);
    } else if (isInRoles(INTERPRETER_ROLES, user.role)) {
      await this.cancelAppointmentsByInterpreter(appointments, user, dto, isFullGroupCancellation);
    } else if (isInRoles(ADMIN_ROLES, user.role)) {
      await this.cancelAppointmentsByAdmin(appointments, user, dto, isFullGroupCancellation);
    }

    return { message: "Appointment group cancelled successfully." };
  }

  public async cancelExpiredAppointmentWithoutCheckIn(appointments: TCancelAppointment[]): Promise<void> {
    const isFullGroupCancellation = false;
    const isCancelledByClient = false;

    for (const appointment of appointments) {
      await this.cleanupAppointmentAfterCancellation(appointment, isFullGroupCancellation);
      await this.notifyAllAppointmentParticipants(appointment, isFullGroupCancellation);

      await this.queueInitializeService.addProcessPaymentOperationQueue(
        appointment.id,
        EPaymentOperation.AUTHORIZATION_CANCEL_PAYMENT,
        { isCancelledByClient },
      );
    }
  }

  private async cancelAppointmentByClient(
    appointment: TCancelAppointment,
    isFullGroupCancellation: boolean,
  ): Promise<void> {
    if (appointment.isGroupAppointment && !isFullGroupCancellation) {
      throw new BadRequestException(EAppointmentErrorCodes.CANNOT_CANCEL_SINGLE_GROUP_APPOINTMENT);
    }

    if (appointment.status === EAppointmentStatus.PENDING) {
      await this.appointmentRepository.update(appointment.id, { status: EAppointmentStatus.CANCELLED_ORDER });
    }

    if (appointment.status === EAppointmentStatus.ACCEPTED || appointment.status === EAppointmentStatus.LIVE) {
      await this.appointmentRepository.update(appointment.id, { status: EAppointmentStatus.CANCELLED });

      if (appointment.interpreterId && !isFullGroupCancellation) {
        await this.notifyInterpreters([appointment]);
      }
    }

    await this.cleanupAppointmentAfterCancellation(appointment, isFullGroupCancellation);
  }

  private async cancelAppointmentByInterpreter(
    appointment: TCancelAppointment,
    user: ITokenUserData,
    isFullGroupCancellation: boolean,
  ): Promise<void> {
    if (appointment.isGroupAppointment && appointment.sameInterpreter && !isFullGroupCancellation) {
      throw new BadRequestException(EAppointmentErrorCodes.CANNOT_CANCEL_SINGLE_GROUP_APPOINTMENT);
    }

    if (appointment.appointmentAdminInfo) {
      await this.appointmentsCommandService.updateAppointmentAdminInfo(appointment.appointmentAdminInfo);
    }

    await this.interpreterCancellationRecordService.checkInterpreterCancellationRecord(appointment, user);
    await this.appointmentRepository.update(appointment.id, { status: EAppointmentStatus.PENDING, interpreter: null });
    await this.cleanupInterpreterAppointmentAfterCancellation(appointment);

    if (!isFullGroupCancellation) {
      await this.handleOrderRecreation(appointment, isFullGroupCancellation);
      void this.notifyAdmins(appointment, isFullGroupCancellation).catch((error: Error) =>
        this.lokiLogger.error(`Failed to send emails to admins about appointment: ${appointment.id}`, error.stack),
      );
    }
  }

  private async cancelAppointmentByAdmin(
    appointment: TCancelAppointment,
    isFullGroupCancellation: boolean,
  ): Promise<void> {
    await this.appointmentRepository.update(appointment.id, { status: EAppointmentStatus.CANCELLED });
    await this.cleanupAppointmentAfterCancellation(appointment, isFullGroupCancellation);

    if (!isFullGroupCancellation) {
      await this.notifyAllAppointmentParticipants(appointment, isFullGroupCancellation);
    }
  }

  private async cancelAppointmentsByClient(
    appointments: TCancelAppointment[],
    user: ITokenUserData,
    dto: CancelAppointmentDto,
    isFullGroupCancellation: boolean,
  ): Promise<void> {
    for (const appointment of appointments) {
      await this.cancelAppointmentByClient(appointment, isFullGroupCancellation);
      await this.finalizeCancellationWorkflow(appointment, user, dto);
    }

    await this.notifyInterpreters(appointments);
  }

  private async cancelAppointmentsByInterpreter(
    appointments: TCancelAppointment[],
    user: ITokenUserData,
    dto: CancelAppointmentDto,
    isFullGroupCancellation: boolean,
  ): Promise<void> {
    const appointmentsAssignedToInterpreter = appointments.filter(
      (appointment) => appointment.interpreterId === user.userRoleId,
    );
    const [mainAppointment] = appointmentsAssignedToInterpreter;

    if (appointmentsAssignedToInterpreter.length === 0) {
      throw new BadRequestException(EAppointmentErrorCodes.NOT_ASSIGNED_TO_GROUP_APPOINTMENTS);
    }

    for (const appointment of appointmentsAssignedToInterpreter) {
      await this.cancelAppointmentByInterpreter(appointment, user, isFullGroupCancellation);
      await this.finalizeCancellationWorkflow(appointment, user, dto);
    }

    await this.handleOrderRecreation(mainAppointment, isFullGroupCancellation);
    void this.notifyAdmins(mainAppointment, isFullGroupCancellation).catch((error: Error) =>
      this.lokiLogger.error(
        `Failed to send emails to admins about appointment group: ${mainAppointment.appointmentsGroupId}`,
        error.stack,
      ),
    );
  }

  private async cancelAppointmentsByAdmin(
    appointments: TCancelAppointment[],
    user: ITokenUserData,
    dto: CancelAppointmentDto,
    isFullGroupCancellation: boolean,
  ): Promise<void> {
    const [mainAppointment] = appointments;

    for (const appointment of appointments) {
      await this.cancelAppointmentByAdmin(appointment, isFullGroupCancellation);
      await this.finalizeCancellationWorkflow(appointment, user, dto);
    }

    await this.notifyInterpreters(appointments);
    await this.notifyAllAppointmentParticipants(mainAppointment, isFullGroupCancellation);
  }

  private async finalizeCancellationWorkflow(
    appointment: TCancelAppointment,
    user: ITokenUserData,
    dto: CancelAppointmentDto,
  ): Promise<void> {
    const isCancelledByClient =
      appointment.clientId === user.userRoleId || (isInRoles(ADMIN_ROLES, user.role) && dto.isAdminCancelByClient);

    await this.createAppointmentCancellationInfo(appointment, user, dto);
    await this.queueInitializeService.addProcessPaymentOperationQueue(
      appointment.id,
      EPaymentOperation.AUTHORIZATION_CANCEL_PAYMENT,
      { isCancelledByClient },
    );
  }

  private async createAppointmentCancellationInfo(
    appointment: TCancelAppointment,
    user: ITokenUserData,
    dto: CancelAppointmentDto,
  ): Promise<void> {
    if (!appointment.appointmentAdminInfo) {
      this.lokiLogger.error(`Failed to create cancellation info. No admin info. Appointment: ${appointment.id}`);

      return;
    }

    let cancelledByUserRoleId = user.userRoleId;

    if (dto.isAdminCancelByClient === true && appointment.clientId) {
      cancelledByUserRoleId = appointment.clientId;
    }

    if (dto.isAdminCancelByClient === false && appointment.interpreterId) {
      cancelledByUserRoleId = appointment.interpreterId;
    }

    const userRole = await findOneOrFailTyped<UserRole>(cancelledByUserRoleId, this.userRoleRepository, {
      where: { id: cancelledByUserRoleId },
      relations: {
        user: true,
        profile: true,
        role: true,
      },
    });

    if (!userRole.user.platformId) {
      this.lokiLogger.error(
        `Appointment cancellation info. User with id ${userRole.user.id} does not have platformId!`,
      );
    }

    const cancellationInfoDto: ICreateAppointmentCancellationInfo = {
      appointmentAdminInfo: appointment.appointmentAdminInfo,
      cancelledById: cancelledByUserRoleId,
      cancelledByPlatformId: userRole.user.platformId || "000000",
      cancelledByFirstName: userRole.profile.firstName,
      cancelledByPreferredName: userRole.profile.preferredName,
      roleName: userRole.role.name,
      cancellationReason: dto?.cancellationReason ?? null,
    };
    const newCancellationInfo = this.appointmentCancellationInfoRepository.create(cancellationInfoDto);
    await this.appointmentCancellationInfoRepository.save(newCancellationInfo);
  }

  private async cleanupAppointmentAfterCancellation(
    appointment: TCancelAppointment,
    isFullGroupCancellation: boolean,
  ): Promise<void> {
    const { id, chimeMeetingConfiguration, appointmentAdminInfo, appointmentOrder } = appointment;

    await this.messagingResolveService.handleChannelResolveProcess(id);
    await this.appointmentSharedService.deleteAppointmentShortUrls(appointment.id);
    await this.appointmentSharedService.deleteAppointmentReminder(appointment.id);

    if (chimeMeetingConfiguration) {
      await this.appointmentSharedService.deleteChimeMeetingWithAttendees(chimeMeetingConfiguration);
    }

    if (appointmentAdminInfo && appointmentAdminInfo.isRedFlagEnabled) {
      await this.appointmentSharedService.disableRedFlag(appointment);
    }

    if (
      appointmentOrder &&
      appointmentOrder.appointmentOrderGroup &&
      (isFullGroupCancellation || appointmentOrder.appointmentOrderGroup.appointmentOrders.length === 1)
    ) {
      await this.appointmentOrderSharedLogicService.removeGroupAndAssociatedOrders(
        appointmentOrder.appointmentOrderGroup,
      );
    } else if (appointmentOrder) {
      await this.appointmentOrderSharedLogicService.removeAppointmentOrderBatch(appointmentOrder);
    }
  }

  private async cleanupInterpreterAppointmentAfterCancellation(appointment: TCancelAppointment): Promise<void> {
    const { id, chimeMeetingConfiguration, interpreterId } = appointment;

    await this.messagingResolveService.handleChannelResolveProcess(id);

    if (chimeMeetingConfiguration && interpreterId) {
      await this.attendeeManagementService.deleteAttendeeByExternalUserId(chimeMeetingConfiguration, interpreterId);
    }
  }

  private async handleOrderRecreation(
    appointment: TCancelAppointment,
    isFullGroupCancellation: boolean,
  ): Promise<void> {
    const recreationType = this.getRecreationType(appointment, isFullGroupCancellation);
    await this.appointmentOrderRecreationService.handleOrderRecreationForCancelledAppointment(
      appointment,
      recreationType,
    );
  }

  private getRecreationType(
    appointment: TCancelAppointment,
    isFullGroupCancellation: boolean,
  ): EAppointmentRecreationType {
    if (!appointment.isGroupAppointment) {
      return EAppointmentRecreationType.SINGLE;
    }

    if (appointment.sameInterpreter || isFullGroupCancellation) {
      return EAppointmentRecreationType.GROUP;
    } else {
      return EAppointmentRecreationType.SINGLE_IN_GROUP;
    }
  }

  private async notifyAdmins(appointment: TCancelAppointment, isFullGroupCancellation: boolean): Promise<void> {
    const superAdmins = await this.helperService.getSuperAdmin();
    const platformId =
      isFullGroupCancellation && appointment.appointmentsGroupId
        ? appointment.appointmentsGroupId
        : appointment.platformId;

    for (const superAdmin of superAdmins) {
      if (appointment.interpreter) {
        await this.appointmentNotificationService.sendInterpreterCanceledNotification(
          superAdmin,
          platformId,
          appointment.interpreter.user.platformId || "",
          isFullGroupCancellation,
        );
      }
    }
  }

  private async notifyAllAppointmentParticipants(
    appointment: TCancelAppointment,
    isFullGroupCancellation: boolean,
  ): Promise<void> {
    const appointmentDetails: IAppointmentDetailsOutput =
      isFullGroupCancellation && appointment.appointmentsGroupId
        ? { appointmentsGroupId: appointment.appointmentsGroupId }
        : { appointmentId: appointment.id };

    if (appointment.client) {
      await this.appointmentNotificationService.sendAdminCanceledNotification(
        appointment.client as UserRole,
        appointment.platformId,
        appointmentDetails,
        isFullGroupCancellation,
      );
    }

    if (appointment.interpreter && !isFullGroupCancellation) {
      await this.appointmentNotificationService.sendAdminCanceledNotification(
        appointment.interpreter as UserRole,
        appointment.platformId,
        appointmentDetails,
        isFullGroupCancellation,
      );
    }

    if (appointment.participants) {
      for (const participant of appointment.participants) {
        await this.appointmentNotificationService.sendAppointmentCancelledToExtraParticipantNotification(
          participant,
          appointment,
          isFullGroupCancellation,
        );
      }
    }
  }

  private async notifyInterpreters(appointments: TCancelAppointment[]): Promise<void> {
    let notifiedInterpreter: UserRole | null = null;

    for (const appointment of appointments) {
      const { sameInterpreter, appointmentsGroupId, interpreter, platformId, id } = appointment;
      const isCancellationRestrictedByTimeLimits =
        this.appointmentSharedService.isAppointmentCancellationRestrictedByTimeLimits(appointment as Appointment);

      if (sameInterpreter && appointmentsGroupId) {
        if (!notifiedInterpreter && interpreter) {
          notifiedInterpreter = interpreter as UserRole;
          await this.appointmentNotificationService.sendClientCanceledAppointmentNotification(
            notifiedInterpreter,
            appointmentsGroupId,
            isCancellationRestrictedByTimeLimits,
            { appointmentsGroupId },
            true,
          );
        }
      } else if (interpreter) {
        await this.appointmentNotificationService.sendClientCanceledAppointmentNotification(
          interpreter as UserRole,
          platformId,
          isCancellationRestrictedByTimeLimits,
          { appointmentId: id },
          false,
        );
      }
    }
  }
}
