import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { TLoadAppointmentAuthorizationContext } from "src/modules/payment-analysis/common/types/authorization";
import { IAuthorizationPaymentContext } from "src/modules/payment-analysis/common/interfaces/authorization";
import { IncomingPaymentWaitList } from "src/modules/payments-new/entities";
import { Between, DataSource, EntityManager, FindOptionsWhere, Repository } from "typeorm";
import { AppointmentFailedPaymentCancelTempService } from "src/modules/appointments/failed-payment-cancel/services";
import {
  IFetchPaymentFrameInterval,
  IPaymentOperationResult,
  IPaymentWaitList,
  IRedirectToPaymentWaitListOptions,
} from "src/modules/payments-new/common/interfaces";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { PaymentsNotificationService } from "src/modules/payments-new/services";
import { EPaymentFailedReason } from "src/modules/payments-new/common/enums";
import { LokiLogger } from "src/common/logger";
import {
  PAYMENT_AUTHORIZATION_CUTOFF_MINUTES,
  PAYMENT_PROCESSING_OFFSETS,
} from "src/modules/payments-new/common/constants";
import { addMinutes, differenceInMinutes, subMilliseconds } from "date-fns";
import { NUMBER_OF_MINUTES_IN_HALF_HOUR, NUMBER_OF_MINUTES_IN_TEN_MINUTES } from "src/common/constants";
import { findManyTyped } from "src/common/utils";
import { CheckPaymentWaitListQuery, TCheckPaymentWaitList } from "src/modules/payments-new/common/types";
import { InjectRepository } from "@nestjs/typeorm";
import { PaymentAnalysisService } from "src/modules/payment-analysis/services";
import { EPaymentOperation } from "src/modules/payment-analysis/common/enums";

@Injectable()
export class PaymentsWaitListService {
  private readonly lokiLogger = new LokiLogger(PaymentsWaitListService.name);
  constructor(
    @InjectRepository(IncomingPaymentWaitList)
    private readonly incomingPaymentWaitListRepository: Repository<IncomingPaymentWaitList>,
    private readonly paymentsNotificationService: PaymentsNotificationService,
    private readonly paymentsAnalysisService: PaymentAnalysisService,
    private readonly appointmentFailedPaymentCancelService: AppointmentFailedPaymentCancelTempService,
    private readonly dataSource: DataSource,
  ) {}

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
        return await this.constructAndCreateWaitList(manager, appointment, options);
      } else if (isShortTimeSlot) {
        return await this.setWaitListAsShortTimeSlot(manager, waitListContext.existingWaitListRecord.id);
      }

      return { success: true };
    } catch (error) {
      await this.paymentsNotificationService.sendAuthorizationPaymentFailedNotification(
        context.appointment,
        EPaymentFailedReason.AUTH_FAILED,
      );
      this.lokiLogger.error(`Failed to authorize payment for appointmentId: ${appointment.id}`, (error as Error).stack);
      throw new InternalServerErrorException("Failed to authorize payment.");
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

  private async setWaitListAsShortTimeSlot(manager: EntityManager, id: string): Promise<IPaymentOperationResult> {
    await manager.getRepository(IncomingPaymentWaitList).update({ id }, { isShortTimeSlot: true });

    return { success: true };
  }

  private async constructAndCreateWaitList(
    manager: EntityManager,
    appointment: TLoadAppointmentAuthorizationContext,
    options: IRedirectToPaymentWaitListOptions,
  ): Promise<IPaymentOperationResult> {
    const waitListDto = this.constructWaitListDto(appointment, options);
    await this.createWaitList(manager, waitListDto);

    return { success: true };
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

          await manager.getRepository(IncomingPaymentWaitList).delete(waitListRecord);
          await this.paymentsAnalysisService.analyzePaymentAction(appointment.id, EPaymentOperation.AUTHORIZE_PAYMENT, {
            isShortTimeSlot: waitListRecord.isShortTimeSlot,
          });
        }
      });
      this.lokiLogger.log(
        `Payment wait list check completed successfully. Processed: ${paymentsWaitList.length} items.`,
      );
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
