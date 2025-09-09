import { Injectable } from "@nestjs/common";
import { ESortOrder } from "src/common/enums";
import {
  CONFLICT_APPOINTMENT_ACCEPTED_STATUSES,
  CONFLICT_APPOINTMENT_CONFIRMED_STATUSES,
} from "src/modules/appointments/shared/common/constants";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { FindManyOptions, In, LessThanOrEqual, MoreThanOrEqual, Not, Repository, SelectQueryBuilder } from "typeorm";

@Injectable()
export class BookingSlotManagementQueryOptionsService {
  private readonly FIXED_LIMIT: number = 10;
  private readonly FIXED_LIMIT_FOR_GROUP: number = 200;

  public getConflictingAppointmentsBeforeCreationOptions(
    userRoleId: string,
    start: Date,
    end: Date,
  ): FindManyOptions<Appointment> {
    return {
      select: {
        id: true,
        platformId: true,
        scheduledStartTime: true,
        scheduledEndTime: true,
      },
      where: {
        clientId: userRoleId,
        status: In(CONFLICT_APPOINTMENT_CONFIRMED_STATUSES),
        scheduledStartTime: LessThanOrEqual(end),
        scheduledEndTime: MoreThanOrEqual(start),
      },
      take: this.FIXED_LIMIT,
    };
  }

  public getConflictingAppointmentsGroupBeforeCreationQB(
    repository: Repository<Appointment>,
    userRoleId: string,
    timeClauses: string,
  ): SelectQueryBuilder<Appointment> {
    return repository
      .createQueryBuilder("appointment")
      .select([
        "appointment.id",
        "appointment.platformId",
        "appointment.scheduledStartTime",
        "appointment.scheduledEndTime",
      ])
      .where("appointment.clientId = :userRoleId", { userRoleId })
      .andWhere("appointment.status IN (:...statuses)", {
        statuses: CONFLICT_APPOINTMENT_CONFIRMED_STATUSES,
      })
      .andWhere(timeClauses)
      .orderBy("appointment.scheduledStartTime", ESortOrder.ASC)
      .take(this.FIXED_LIMIT);
  }

  public getConflictingAppointmentsBeforeUpdateOptions(
    userRoleId: string,
    appointmentId: string,
    start: Date,
    end: Date,
  ): FindManyOptions<Appointment> {
    return {
      select: {
        id: true,
        platformId: true,
        scheduledStartTime: true,
        scheduledEndTime: true,
      },
      where: {
        id: Not(appointmentId),
        clientId: userRoleId,
        status: In(CONFLICT_APPOINTMENT_CONFIRMED_STATUSES),
        scheduledStartTime: LessThanOrEqual(end),
        scheduledEndTime: MoreThanOrEqual(start),
      },
      take: this.FIXED_LIMIT,
    };
  }

  public getConflictingAppointmentsBeforeAcceptOptions(
    userRoleId: string,
    start: Date,
    end: Date,
  ): FindManyOptions<Appointment> {
    return {
      select: {
        id: true,
        platformId: true,
        scheduledStartTime: true,
        scheduledEndTime: true,
        sameInterpreter: true,
        isGroupAppointment: true,
        appointmentsGroupId: true,
      },
      where: {
        interpreterId: userRoleId,
        status: In(CONFLICT_APPOINTMENT_ACCEPTED_STATUSES),
        scheduledStartTime: LessThanOrEqual(end),
        scheduledEndTime: MoreThanOrEqual(start),
      },
      take: this.FIXED_LIMIT_FOR_GROUP,
    };
  }

  public getConflictingAppointmentGroupBeforeAcceptQB(
    repository: Repository<Appointment>,
    userRoleId: string,
    timeClauses: string,
  ): SelectQueryBuilder<Appointment> {
    return repository
      .createQueryBuilder("appointment")
      .select([
        "appointment.id",
        "appointment.platformId",
        "appointment.interpreterId",
        "appointment.scheduledStartTime",
        "appointment.scheduledEndTime",
        "appointment.sameInterpreter",
        "appointment.isGroupAppointment",
        "appointment.appointmentsGroupId",
      ])
      .where("appointment.interpreterId = :userRoleId", { userRoleId })
      .andWhere(timeClauses)
      .andWhere("appointment.status IN (:...statuses)", {
        statuses: CONFLICT_APPOINTMENT_ACCEPTED_STATUSES,
      })
      .orderBy("appointment.scheduledStartTime", ESortOrder.ASC)
      .take(this.FIXED_LIMIT_FOR_GROUP);
  }
}
