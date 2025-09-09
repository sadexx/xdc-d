import { Injectable } from "@nestjs/common";
import { CheckInOutAppointmentDto } from "src/modules/appointments/appointment/common/dto";
import { Appointment, AppointmentExternalSession } from "src/modules/appointments/appointment/entities";
import { DataSource, EntityManager } from "typeorm";
import {
  IAppointmentExternalSessionCheckInPayload,
  IAppointmentExternalSessionCheckOutPayload,
} from "src/modules/appointments/appointment/common/interfaces";
import {
  EAppointmentCommunicationType,
  EAppointmentExternalSessionType,
} from "src/modules/appointments/appointment/common/enums";
import { findOneOrFailTyped } from "src/common/utils";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { AppointmentEndService } from "src/modules/appointments/appointment/services";
import { AppointmentQueryOptionsService, AppointmentSharedService } from "src/modules/appointments/shared/services";
import {
  TCheckInOutAlternativePlatformAppointmentUserRole,
  TCheckInOutAppointment,
  TCheckInOutAppointmentDto,
  TCheckOutAppointment,
} from "src/modules/appointments/appointment/common/types";
import { UserRole } from "src/modules/users/entities";
import { QueueInitializeService } from "src/modules/queues/services";

@Injectable()
export class AppointmentExternalSessionService {
  constructor(
    private readonly appointmentEndService: AppointmentEndService,
    private readonly appointmentSharedService: AppointmentSharedService,
    private readonly appointmentQueryOptionsService: AppointmentQueryOptionsService,
    private readonly queueInitializeService: QueueInitializeService,
    private readonly dataSource: DataSource,
  ) {}

  public async queueCheckInOutAppointment(
    id: string,
    dto: CheckInOutAppointmentDto,
    user: ITokenUserData,
  ): Promise<void> {
    await this.queueInitializeService.addCheckInOutAppointmentQueue(id, dto, user);
  }

  public async checkInOutAppointment(id: string, dto: CheckInOutAppointmentDto, user: ITokenUserData): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const queryOptions = this.appointmentQueryOptionsService.checkInOutAppointmentOptions(id);
      const appointment = await findOneOrFailTyped<TCheckInOutAppointment>(
        id,
        manager.getRepository(Appointment),
        queryOptions,
      );

      this.appointmentSharedService.validateAppointmentCheckInOut(appointment, dto, user);

      if (appointment.communicationType === EAppointmentCommunicationType.FACE_TO_FACE) {
        await this.checkInOutFaceToFaceAppointment(manager, appointment, dto as TCheckInOutAppointmentDto);
      } else {
        await this.checkInOutAlternativePlatformAppointment(
          manager,
          appointment,
          dto as TCheckInOutAppointmentDto,
          user,
        );
      }
    });
  }

  private async checkInOutFaceToFaceAppointment(
    manager: EntityManager,
    appointment: TCheckInOutAppointment,
    dto: TCheckInOutAppointmentDto,
  ): Promise<void> {
    switch (dto.type) {
      case EAppointmentExternalSessionType.CHECK_IN_FACE_TO_FACE:
        await this.checkInAppointment(manager, dto, appointment);
        break;
      case EAppointmentExternalSessionType.CHECK_OUT_FACE_TO_FACE:
        await this.checkOutAppointment(manager, dto, appointment as TCheckOutAppointment);
        break;
    }
  }

  private async checkInOutAlternativePlatformAppointment(
    manager: EntityManager,
    appointment: TCheckInOutAppointment,
    dto: TCheckInOutAppointmentDto,
    user: ITokenUserData,
  ): Promise<void> {
    switch (dto.type) {
      case EAppointmentExternalSessionType.CHECK_IN_ALTERNATIVE_PLATFORM:
        await this.processAlternativePlatformCheckIn(manager, appointment, dto, user);
        break;
      case EAppointmentExternalSessionType.CHECK_OUT_ALTERNATIVE_PLATFORM:
        await this.checkOutAppointment(manager, dto, appointment as TCheckOutAppointment);
        break;
    }
  }

  private async processAlternativePlatformCheckIn(
    manager: EntityManager,
    appointment: TCheckInOutAppointment,
    dto: TCheckInOutAppointmentDto,
    user: ITokenUserData,
  ): Promise<void> {
    const queryOptions = this.appointmentQueryOptionsService.checkInAlternativePlatformAppointmentOptions(
      user.userRoleId,
    );
    const userRole = await findOneOrFailTyped<TCheckInOutAlternativePlatformAppointmentUserRole>(
      user.userRoleId,
      manager.getRepository(UserRole),
      queryOptions,
    );
    const fullName = `${userRole.profile.firstName} ${userRole.profile.lastName}`;

    await this.checkInAppointment(
      manager,
      {
        type: dto.type,
        verifyingPersonName: fullName,
        verifyingPersonSignature: fullName,
        alternativeTime: new Date(),
      },
      appointment,
    );
  }

  private async checkInAppointment(
    manager: EntityManager,
    dto: TCheckInOutAppointmentDto,
    appointment: TCheckInOutAppointment,
  ): Promise<void> {
    await this.createOrUpdateAppointmentExternalSession(manager, dto, appointment);
  }

  private async checkOutAppointment(
    manager: EntityManager,
    dto: TCheckInOutAppointmentDto,
    appointment: TCheckOutAppointment,
  ): Promise<void> {
    await this.createOrUpdateAppointmentExternalSession(manager, dto, appointment);

    await this.appointmentEndService.finalizeExternalAppointment(manager, {
      appointmentId: appointment.id,
      scheduledStartTime: appointment.scheduledStartTime,
      scheduledEndTime: appointment.scheduledEndTime,
      schedulingDurationMin: appointment.schedulingDurationMin,
      alternativeStartTime: appointment.appointmentExternalSession.alternativeStartTime ?? null,
      alternativeEndTime: dto.alternativeTime ?? null,
    });
  }

  private async createOrUpdateAppointmentExternalSession(
    manager: EntityManager,
    dto: TCheckInOutAppointmentDto,
    appointment: TCheckInOutAppointment,
  ): Promise<void> {
    if (!appointment.appointmentExternalSession) {
      const checkInDto = this.constructCheckInPayload(dto, appointment);
      await this.createAppointmentExternalSession(manager, checkInDto);
    } else {
      const checkOutDto = this.constructCheckOutPayload(dto);
      await this.updateAppointmentExternalSession(manager, appointment.appointmentExternalSession.id, checkOutDto);
    }
  }

  private async createAppointmentExternalSession(
    manager: EntityManager,
    dto: IAppointmentExternalSessionCheckInPayload,
  ): Promise<void> {
    const appointmentExternalSessionRepository = manager.getRepository(AppointmentExternalSession);

    const newAppointmentExternalSession = appointmentExternalSessionRepository.create({
      firstVerifyingPersonName: dto.firstVerifyingPersonName,
      firstVerifyingPersonSignature: dto.firstVerifyingPersonSignature,
      alternativeStartTime: dto.alternativeStartTime,
      appointment: dto.appointment,
    });
    await appointmentExternalSessionRepository.save(newAppointmentExternalSession);
  }

  private async updateAppointmentExternalSession(
    manager: EntityManager,
    appointmentExternalSessionId: string,
    dto: IAppointmentExternalSessionCheckOutPayload,
  ): Promise<void> {
    const appointmentExternalSessionRepository = manager.getRepository(AppointmentExternalSession);

    await appointmentExternalSessionRepository.update(appointmentExternalSessionId, {
      secondVerifyingPersonName: dto.secondVerifyingPersonName,
      secondVerifyingPersonSignature: dto.secondVerifyingPersonSignature,
      alternativeEndTime: dto.alternativeEndTime,
    });
  }

  private constructCheckInPayload(
    dto: TCheckInOutAppointmentDto,
    appointment: TCheckInOutAppointment,
  ): IAppointmentExternalSessionCheckInPayload {
    return {
      firstVerifyingPersonName: dto.verifyingPersonName,
      firstVerifyingPersonSignature: dto.verifyingPersonSignature,
      alternativeStartTime: dto.alternativeTime ?? null,
      appointment,
    };
  }

  private constructCheckOutPayload(dto: TCheckInOutAppointmentDto): IAppointmentExternalSessionCheckOutPayload {
    return {
      secondVerifyingPersonName: dto.verifyingPersonName,
      secondVerifyingPersonSignature: dto.verifyingPersonSignature,
      alternativeEndTime: dto.alternativeTime ?? null,
    };
  }
}
