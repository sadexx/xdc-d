import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { addMinutes } from "date-fns";
import { CreateExtraDayFaceToFaceDto, CreateExtraDayVirtualDto } from "src/modules/appointments/appointment/common/dto";
import { BookingSlotManagementQueryOptionsService } from "src/modules/booking-slot-management/services";

@Injectable()
export class BookingSlotManagementService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    private readonly bookingSlotManagementQueryOptionsService: BookingSlotManagementQueryOptionsService,
  ) {}

  public async findConflictingAppointmentsBeforeCreation(
    userRoleId: string,
    scheduledStartTime: Date,
    schedulingDurationMin: number,
  ): Promise<Appointment[]> {
    const start = new Date(scheduledStartTime);
    const end = addMinutes(scheduledStartTime, schedulingDurationMin);
    const queryOptions = this.bookingSlotManagementQueryOptionsService.getConflictingAppointmentsBeforeCreationOptions(
      userRoleId,
      start,
      end,
    );

    return this.appointmentRepository.find(queryOptions);
  }

  public async findConflictingAppointmentsGroupBeforeCreation(
    userRoleId: string,
    mainScheduledStartTime: Date,
    mainSchedulingDurationMin: number,
    schedulingExtraDays: (CreateExtraDayVirtualDto | CreateExtraDayFaceToFaceDto)[],
  ): Promise<Appointment[]> {
    const timeRanges = this.buildTimeRangesBeforeCreation(
      mainScheduledStartTime,
      mainSchedulingDurationMin,
      schedulingExtraDays,
    );
    const timeClauses = this.buildOrClauses(timeRanges);
    const queryBuilder = this.bookingSlotManagementQueryOptionsService.getConflictingAppointmentsGroupBeforeCreationQB(
      this.appointmentRepository,
      userRoleId,
      timeClauses,
    );

    for (const [i, range] of timeRanges.entries()) {
      queryBuilder.setParameter(`startTime${i}`, range.start);
      queryBuilder.setParameter(`endTime${i}`, range.end);
    }

    return queryBuilder.getMany();
  }

  public async findConflictingAppointmentsBeforeUpdate(
    userRoleId: string,
    appointmentId: string,
    scheduledStartTime: Date,
    schedulingDurationMin: number,
  ): Promise<Appointment[]> {
    const start = new Date(scheduledStartTime);
    const end = addMinutes(scheduledStartTime, schedulingDurationMin);
    const queryOptions = this.bookingSlotManagementQueryOptionsService.getConflictingAppointmentsBeforeUpdateOptions(
      userRoleId,
      appointmentId,
      start,
      end,
    );

    return this.appointmentRepository.find(queryOptions);
  }

  public async findConflictingAppointmentsBeforeAccept(
    userRoleId: string,
    scheduledStartTime: Date,
    scheduledEndTime: Date,
  ): Promise<Appointment[]> {
    const start = new Date(scheduledStartTime);
    const end = new Date(scheduledEndTime);
    const queryOptions = this.bookingSlotManagementQueryOptionsService.getConflictingAppointmentsBeforeAcceptOptions(
      userRoleId,
      start,
      end,
    );

    return this.appointmentRepository.find(queryOptions);
  }

  public async findConflictingAppointmentGroupBeforeAccept(
    userRoleId: string,
    appointment: { scheduledStartTime: Date; scheduledEndTime: Date }[],
  ): Promise<Appointment[]> {
    const timeRanges = this.buildTimeRangesForCreated(appointment);
    const timeClauses = this.buildOrClauses(timeRanges);
    const queryBuilder = this.bookingSlotManagementQueryOptionsService.getConflictingAppointmentGroupBeforeAcceptQB(
      this.appointmentRepository,
      userRoleId,
      timeClauses,
    );

    for (const [i, range] of timeRanges.entries()) {
      queryBuilder.setParameter(`startTime${i}`, range.start);
      queryBuilder.setParameter(`endTime${i}`, range.end);
    }

    return queryBuilder.getMany();
  }

  private buildTimeRangesBeforeCreation(
    mainScheduledStart: Date,
    mainDuration: number,
    extraDays: (CreateExtraDayVirtualDto | CreateExtraDayFaceToFaceDto)[],
  ): Array<{ start: Date; end: Date }> {
    const ranges = [];

    ranges.push({
      start: mainScheduledStart,
      end: addMinutes(mainScheduledStart, mainDuration),
    });

    for (const extraDay of extraDays) {
      ranges.push({
        start: extraDay.scheduledStartTime,
        end: addMinutes(extraDay.scheduledStartTime, extraDay.schedulingDurationMin),
      });
    }

    return ranges;
  }

  private buildTimeRangesForCreated(
    extraDays: { scheduledStartTime: Date; scheduledEndTime: Date }[],
  ): Array<{ start: Date; end: Date }> {
    return extraDays.map((extraDay) => {
      return {
        start: extraDay.scheduledStartTime,
        end: extraDay.scheduledEndTime,
      };
    });
  }

  private buildOrClauses(timeRanges: Array<{ start: Date; end: Date }>): string {
    const orClauses = timeRanges.map((_, i) => {
      return `(appointment.scheduledStartTime <= :endTime${i} AND appointment.scheduledEndTime >= :startTime${i})`;
    });

    return `(${orClauses.join(" OR ")})`;
  }
}
