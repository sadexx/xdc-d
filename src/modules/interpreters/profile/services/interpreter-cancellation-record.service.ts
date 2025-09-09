import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LokiLogger } from "src/common/logger";
import { LessThanOrEqual, Repository } from "typeorm";
import { InterpreterCancellationRecord, InterpreterProfile } from "src/modules/interpreters/profile/entities";
import { findOneOrFail } from "src/common/utils";
import { addDays, subDays } from "date-fns";
import { IMessageOutput } from "src/common/outputs";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { NUMBER_OF_DAYS_IN_TWO_WEEKS } from "src/common/constants";
import { AppointmentSharedService } from "src/modules/appointments/shared/services";
import { TCancelAppointment } from "src/modules/appointments/appointment/common/types";

@Injectable()
export class InterpreterCancellationRecordService {
  private readonly lokiLogger = new LokiLogger(InterpreterCancellationRecordService.name);
  constructor(
    @InjectRepository(InterpreterProfile)
    private readonly interpreterProfileRepository: Repository<InterpreterProfile>,
    @InjectRepository(InterpreterCancellationRecord)
    private readonly interpreterCancellationRecordRepository: Repository<InterpreterCancellationRecord>,
    private readonly appointmentSharedService: AppointmentSharedService,
  ) {}

  public async checkInterpreterCancellationRecord(
    appointment: TCancelAppointment,
    user: ITokenUserData,
  ): Promise<void> {
    if (this.isShortNoticeCancellation(appointment)) {
      await this.createInterpreterCancellationRecord(user.userRoleId);
    }
  }

  private isShortNoticeCancellation(appointment: TCancelAppointment): boolean {
    const CANCELLATION_NOTICE_PERIOD_HOURS: number = 24;
    const THRESHOLD_PERCENTAGE: number = 30;

    const { createdWithinTimeWindow, remainingPercent, hoursUntilAppointment } =
      this.appointmentSharedService.checkAppointmentTimeConstraints(
        appointment.creationDate,
        appointment.scheduledStartTime,
        CANCELLATION_NOTICE_PERIOD_HOURS,
      );

    if (createdWithinTimeWindow) {
      return remainingPercent <= THRESHOLD_PERCENTAGE;
    }

    return hoursUntilAppointment <= CANCELLATION_NOTICE_PERIOD_HOURS;
  }

  private async createInterpreterCancellationRecord(userRoleId: string): Promise<void> {
    const interpreterProfile = await findOneOrFail(userRoleId, this.interpreterProfileRepository, {
      select: {
        id: true,
        averageRating: true,
        cancellationRecord: {
          id: true,
          shortNoticeCancellationsCount: true,
          firstCancellationDate: true,
        },
      },
      where: { userRole: { id: userRoleId } },
      relations: { cancellationRecord: true },
    });

    if (interpreterProfile.cancellationRecord) {
      const INTERPRETER_CANCELLATION_RATING_BLOCK_COUNT: number = 3;
      const INTERPRETER_CANCELLATION_RECORD_BLOCK_COUNT: number = 5;
      const shortNoticeCancellationsCount = interpreterProfile.cancellationRecord.shortNoticeCancellationsCount + 1;
      const firstCancellationDate = interpreterProfile.cancellationRecord.firstCancellationDate ?? new Date();
      const updateData: Partial<InterpreterCancellationRecord> = {
        shortNoticeCancellationsCount: shortNoticeCancellationsCount,
        updatingDate: new Date(),
        firstCancellationDate: firstCancellationDate,
      };

      if (shortNoticeCancellationsCount === INTERPRETER_CANCELLATION_RATING_BLOCK_COUNT) {
        const RATING_PRECISION: number = 2;
        const newRating =
          interpreterProfile.averageRating <= 1
            ? 0
            : Number((interpreterProfile.averageRating - 1).toFixed(RATING_PRECISION));
        await this.interpreterProfileRepository.update(interpreterProfile.id, {
          averageRating: newRating,
        });
      }

      if (shortNoticeCancellationsCount === INTERPRETER_CANCELLATION_RECORD_BLOCK_COUNT) {
        const lockStartDate = new Date();
        const lockEndDate = addDays(lockStartDate, NUMBER_OF_DAYS_IN_TWO_WEEKS);
        await this.interpreterProfileRepository.update(interpreterProfile.id, {
          isTemporaryBlocked: true,
        });
        updateData.lockStartDate = lockStartDate;
        updateData.lockEndDate = lockEndDate;
      }

      await this.interpreterCancellationRecordRepository.update(interpreterProfile.cancellationRecord.id, updateData);

      return;
    }

    const cancellationRecord = this.interpreterCancellationRecordRepository.create({
      interpreterProfile: interpreterProfile,
      firstCancellationDate: new Date(),
      shortNoticeCancellationsCount: 1,
    });

    await this.interpreterCancellationRecordRepository.save(cancellationRecord);
  }

  public async unlockInterpreterProfile(userRoleId: string): Promise<IMessageOutput> {
    const interpreterProfile = await findOneOrFail(userRoleId, this.interpreterProfileRepository, {
      select: {
        id: true,
        cancellationRecord: {
          id: true,
        },
      },
      where: { isTemporaryBlocked: true, userRole: { id: userRoleId } },
      relations: { cancellationRecord: true },
    });

    if (!interpreterProfile.cancellationRecord) {
      throw new NotFoundException("Cancellation record not found.");
    }

    await this.unblockInterpreterProfiles(interpreterProfile.id);
    await this.resetCancellationRecords(interpreterProfile.cancellationRecord.id);

    return { message: "Interpreter profile unlocked successfully." };
  }

  public async unlockInterpreterProfiles(): Promise<void> {
    const currentTime = new Date();
    const interpreterProfiles = await this.interpreterProfileRepository.find({
      select: {
        id: true,
        cancellationRecord: {
          id: true,
        },
      },
      where: {
        isTemporaryBlocked: true,
        cancellationRecord: { lockEndDate: LessThanOrEqual(currentTime) },
      },
      relations: { cancellationRecord: true },
    });

    if (interpreterProfiles.length === 0) {
      this.lokiLogger.warn("No interpreter profiles found to unlock.");

      return;
    }

    const interpreterProfileIds = interpreterProfiles.map((interpreterProfile) => interpreterProfile.id);
    const cancellationRecordIds: string[] = [];

    for (const interpreterProfile of interpreterProfiles) {
      if (!interpreterProfile.cancellationRecord) {
        this.lokiLogger.error(
          `Cancellation record not found for interpreter profile id: ${interpreterProfile.id}. Profile will not be successfully unlocked.`,
        );
        continue;
      }

      cancellationRecordIds.push(interpreterProfile.cancellationRecord.id);
    }

    await this.unblockInterpreterProfiles(interpreterProfileIds);
    await this.resetCancellationRecords(cancellationRecordIds);

    this.lokiLogger.log(`Unlocked ${interpreterProfiles.length} interpreter profiles.`);
  }

  public async resetInterpreterCancellationRecords(): Promise<void> {
    const currentTime = new Date();
    const MAX_CANCELLATIONS: number = 4;
    const DAYS_UNTIL_RESET: number = 30;
    const cutoffDate = subDays(currentTime, DAYS_UNTIL_RESET);

    const cancellationRecords = await this.interpreterCancellationRecordRepository.find({
      select: {
        id: true,
      },
      where: {
        shortNoticeCancellationsCount: LessThanOrEqual(MAX_CANCELLATIONS),
        firstCancellationDate: LessThanOrEqual(cutoffDate),
      },
    });

    if (cancellationRecords.length === 0) {
      this.lokiLogger.warn("No interpreter cancellation records found to reset.");

      return;
    }

    const cancellationRecordIds = cancellationRecords.map((record) => record.id);
    await this.resetCancellationRecords(cancellationRecordIds);

    this.lokiLogger.log(`Reset ${cancellationRecords.length} interpreter cancellation records.`);
  }

  private async unblockInterpreterProfiles(ids: string | string[]): Promise<void> {
    const normalizedIds = Array.isArray(ids) ? ids : [ids];

    if (normalizedIds.length === 0) {
      return;
    }

    await this.interpreterProfileRepository.update(normalizedIds, { isTemporaryBlocked: false });
  }

  private async resetCancellationRecords(ids: string | string[]): Promise<void> {
    const normalizedIds = Array.isArray(ids) ? ids : [ids];

    if (normalizedIds.length === 0) {
      return;
    }

    await this.interpreterCancellationRecordRepository.update(normalizedIds, {
      shortNoticeCancellationsCount: 0,
      firstCancellationDate: null,
      lockStartDate: null,
      lockEndDate: null,
    });
  }
}
