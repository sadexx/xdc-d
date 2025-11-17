import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { TLoadAppointmentAuthorizationContext } from "src/modules/payments-analysis/common/types/authorization";
import { IAuthorizationPaymentContext } from "src/modules/payments-analysis/common/interfaces/authorization";
import { IncomingPaymentWaitList } from "src/modules/payments/entities";
import { Between, DataSource, EntityManager, FindOptionsWhere, Repository } from "typeorm";
import { AppointmentFailedPaymentCancelService } from "src/modules/appointments/failed-payment-cancel/services";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { PaymentsNotificationService } from "src/modules/payments/services";
import { EPaymentFailedReason, EPaymentsErrorCodes } from "src/modules/payments/common/enums/core";
import { LokiLogger } from "src/common/logger";
import {
  PAYMENT_AUTHORIZATION_CUTOFF_MINUTES,
  PAYMENT_PROCESSING_OFFSETS,
} from "src/modules/payments/common/constants";
import { addMinutes, differenceInMinutes, subMilliseconds } from "date-fns";
import { NUMBER_OF_MINUTES_IN_HALF_HOUR, NUMBER_OF_MINUTES_IN_TEN_MINUTES } from "src/common/constants";
import { findManyTyped } from "src/common/utils";
import { CheckPaymentWaitListQuery, TCheckPaymentWaitList } from "src/modules/payments/common/types/authorization";
import { InjectRepository } from "@nestjs/typeorm";
import { EPaymentOperation } from "src/modules/payments-analysis/common/enums/core";
import { QueueInitializeService } from "src/modules/queues/services";
import {
  IRedirectToPaymentWaitListOptions,
  IPaymentWaitList,
  IFetchPaymentFrameInterval,
} from "src/modules/payments/common/interfaces/authorization";
import { IPaymentOperationResult } from "src/modules/payments/common/interfaces/core";

@Injectable()
export class PaymentsWaitListService {
  private readonly lokiLogger = new LokiLogger(PaymentsWaitListService.name);
  constructor(
    @InjectRepository(IncomingPaymentWaitList)
    private readonly incomingPaymentWaitListRepository: Repository<IncomingPaymentWaitList>,
    private readonly paymentsNotificationService: PaymentsNotificationService,
    private readonly appointmentFailedPaymentCancelService: AppointmentFailedPaymentCancelService,
    private readonly queueInitializeService: QueueInitializeService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Redirects payment authorization to wait list.
   *
   * Handles payment scenarios by adding appointment to wait list for later processing.
   * If too late (close to start time), cancels appointment instead. Creates new wait list
   * record or updates existing one with short time slot flag if needed.
   *
   * @param manager - Entity manager for transaction
   * @param context - Authorization context with appointment and timing data
   * @param options - Redirect options including first attempt failure and short time slot flags
   * @returns Success result indicating wait list handling completed
   * @throws {InternalServerErrorException} If wait list operation fails
   */
  public async redirectPaymentToWaitList(
    manager: EntityManager,
    context: IAuthorizationPaymentContext,
    options: IRedirectToPaymentWaitListOptions,
  ): Promise<IPaymentOperationResult> {
    const { appointment, waitListContext, timingContext } = context;
    const { isShortTimeSlot } = options;
    try {
      if (timingContext.isTooLateForPayment) {
        return await this.handleTooLateScenario(manager, context);
      }

      if (!waitListContext.existingWaitListRecord) {
        await this.constructAndCreateWaitList(manager, appointment, options);
      } else if (isShortTimeSlot) {
        await this.setWaitListAsShortTimeSlot(manager, waitListContext.existingWaitListRecord.id);
      }

      return { success: true };
    } catch (error) {
      await this.paymentsNotificationService.sendAuthorizationPaymentFailedNotification(
        context.appointment,
        EPaymentFailedReason.AUTH_FAILED,
      );
      this.lokiLogger.error(
        `Failed to process redirect to wait list for appointmentId: ${appointment.id}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(EPaymentsErrorCodes.REDIRECT_TO_WAIT_LIST_FAILED);
    }
  }

  private async handleTooLateScenario(
    manager: EntityManager,
    context: IAuthorizationPaymentContext,
  ): Promise<IPaymentOperationResult> {
    const { waitListContext, appointment } = context;

    if (waitListContext.existingWaitListRecord) {
      await manager.getRepository(IncomingPaymentWaitList).delete({ id: waitListContext.existingWaitListRecord.id });
    }

    await this.appointmentFailedPaymentCancelService.cancelAppointmentPaymentFailed(manager, appointment.id);

    return { success: false };
  }

  private async setWaitListAsShortTimeSlot(manager: EntityManager, id: string): Promise<void> {
    await manager.getRepository(IncomingPaymentWaitList).update({ id }, { isShortTimeSlot: true });
  }

  private async constructAndCreateWaitList(
    manager: EntityManager,
    appointment: TLoadAppointmentAuthorizationContext,
    options: IRedirectToPaymentWaitListOptions,
  ): Promise<void> {
    const waitListDto = this.constructWaitListDto(appointment, options);
    await this.createWaitList(manager, waitListDto);
  }

  private async createWaitList(manager: EntityManager, dto: IPaymentWaitList): Promise<void> {
    const incomingPaymentWaitListRepository = manager.getRepository(IncomingPaymentWaitList);

    const newWaitListDto = incomingPaymentWaitListRepository.create(dto);
    await incomingPaymentWaitListRepository.save(newWaitListDto);
  }

  private constructWaitListDto(
    appointment: TLoadAppointmentAuthorizationContext,
    options: IRedirectToPaymentWaitListOptions,
  ): IPaymentWaitList {
    const determinedAttemptCount = options.isFirstAttemptFailed ? 1 : 0;
    const determinedTimeSlot = options.isShortTimeSlot ?? false;

    return {
      paymentAttemptCount: determinedAttemptCount,
      isShortTimeSlot: determinedTimeSlot,
      appointment: appointment as Appointment,
    };
  }

  /**
   * Processes payment wait list.
   *
   * Scheduled job that checks wait list for pending payment retries. For each record:
   * - Cancels appointment if now overdue
   * - Skips short time slots during off-hours
   * - Removes from wait list and re-queues authorization for eligible appointments
   *
   * On transaction failure, processes each wait list item individually to prevent total failure.
   *
   * @returns Promise that resolves when wait list processing completes
   */
  public async checkPaymentWaitList(): Promise<void> {
    const whereOptions = this.fetchWaitListWhereOptions();
    const paymentsWaitList = await findManyTyped<TCheckPaymentWaitList[]>(this.incomingPaymentWaitListRepository, {
      select: CheckPaymentWaitListQuery.select,
      where: whereOptions,
      relations: CheckPaymentWaitListQuery.relations,
    });

    try {
      await this.dataSource.transaction(async (manager) => {
        for (const waitListRecord of paymentsWaitList) {
          const { appointment } = waitListRecord;

          if (this.isOverdueAppointment(appointment)) {
            await this.appointmentFailedPaymentCancelService.cancelAppointmentPaymentFailed(manager, appointment.id);
            continue;
          }

          if (this.shouldSkipShortTimeSlot(waitListRecord)) {
            continue;
          }

          await manager.getRepository(IncomingPaymentWaitList).delete({ id: waitListRecord.id });

          await this.queueInitializeService.addProcessPaymentOperationQueue(
            appointment.id,
            EPaymentOperation.AUTHORIZE_PAYMENT,
            { isShortTimeSlot: waitListRecord.isShortTimeSlot },
          );
        }
      });

      if (paymentsWaitList.length > 0) {
        this.lokiLogger.log(
          `Payment wait list check completed successfully. Processed: ${paymentsWaitList.length} items.`,
        );
      }
    } catch (error) {
      await this.processTransactionFailedWaitListCheck(paymentsWaitList);
      this.lokiLogger.error(`Transaction failed during payment wait list check.`, (error as Error).message);
    }
  }

  private fetchWaitListWhereOptions(): FindOptionsWhere<IncomingPaymentWaitList>[] {
    const currentTime = new Date();
    const whereOptions: FindOptionsWhere<IncomingPaymentWaitList>[] = [];

    for (const shift of PAYMENT_PROCESSING_OFFSETS) {
      const shiftedDate = addMinutes(currentTime, shift);
      const interval = this.fetchPaymentFrameInterval(shiftedDate);
      whereOptions.push({
        appointment: { scheduledStartTime: Between(interval.timeframeStart, interval.timeframeEnd) },
      });
    }

    whereOptions.push({ isShortTimeSlot: true });

    return whereOptions;
  }

  private fetchPaymentFrameInterval(baseDate: Date): IFetchPaymentFrameInterval {
    const date = new Date(baseDate);
    const minutes = date.getMinutes();
    const roundedMinutes = Math.floor(minutes / NUMBER_OF_MINUTES_IN_TEN_MINUTES) * NUMBER_OF_MINUTES_IN_TEN_MINUTES;

    const timeframeStart = new Date(date);
    timeframeStart.setMinutes(roundedMinutes, 0, 0);

    const timeframeEnd = subMilliseconds(addMinutes(new Date(timeframeStart), NUMBER_OF_MINUTES_IN_TEN_MINUTES), 1);

    return { timeframeStart, timeframeEnd };
  }

  private async processTransactionFailedWaitListCheck(paymentsWaitList: TCheckPaymentWaitList[]): Promise<void> {
    for (const waitListRecord of paymentsWaitList) {
      await this.incomingPaymentWaitListRepository.update(
        { id: waitListRecord.id },
        { paymentAttemptCount: waitListRecord.paymentAttemptCount + 1 },
      );
    }
  }

  private isOverdueAppointment(appointment: TCheckPaymentWaitList["appointment"]): boolean {
    const cutoffTime = addMinutes(new Date(), PAYMENT_AUTHORIZATION_CUTOFF_MINUTES);

    return new Date(appointment.scheduledStartTime) <= cutoffTime;
  }

  private shouldSkipShortTimeSlot(waitListRecord: TCheckPaymentWaitList): boolean {
    return (
      waitListRecord.isShortTimeSlot &&
      differenceInMinutes(new Date(), waitListRecord.updatingDate) < NUMBER_OF_MINUTES_IN_HALF_HOUR
    );
  }
}
