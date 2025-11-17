import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { addMinutes } from "date-fns";
import { isUUID } from "validator";
import {
  NUMBER_OF_MINUTES_IN_THREE_QUARTERS_OF_HOUR,
  NUMBER_OF_SECONDS_IN_MINUTE,
  NUMBER_OF_MINUTES_IN_FIVE_MINUTES,
  NUMBER_OF_MINUTES_IN_THREE_MINUTES,
  NUMBER_OF_MINUTES_IN_SIX_HOURS,
} from "src/common/constants";
import { IMessageOutput } from "src/common/outputs";
import { findManyTyped, findOneOrFailTyped } from "src/common/utils";
import { IWebSocketUserData } from "src/modules/web-socket-gateway/common/interfaces";
import {
  EAppointmentErrorCodes,
  EAppointmentInterpretingType,
  EAppointmentStatus,
} from "src/modules/appointments/appointment/common/enums";
import { ILiveAppointmentCacheData } from "src/modules/appointments/appointment/common/interfaces";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, Repository } from "typeorm";
import { RedisService } from "src/modules/redis/services";
import { ENotificationDataType } from "src/modules/notifications/common/enum";
import {
  LiveAppointmentCacheQuery,
  RateForBusinessExtension,
  TLiveAppointmentCache,
  TRateForBusinessExtension,
} from "src/modules/appointments/appointment/common/types";
import { IAppointmentEndingMessageOutput } from "src/modules/appointments/appointment/common/outputs";
import { Rate } from "src/modules/rates/entities";
import { ERateDetailsSequence, ERateQualifier } from "src/modules/rates/common/enums";
import { applyRateTimeToDate } from "src/modules/rates/common/utils";
import { toZonedTime } from "date-fns-tz";
import { QueueInitializeService } from "src/modules/queues/services";
import { EPaymentOperation } from "src/modules/payments-analysis/common/enums/core";

@Injectable()
export class AppointmentExtensionService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Rate)
    private readonly ratesRepository: Repository<Rate>,
    private readonly redisService: RedisService,
    private readonly queueInitializeService: QueueInitializeService,
  ) {}

  public async handleUpdateAppointmentBusinessTime(id: string): Promise<IMessageOutput> {
    const cacheKey = this.buildCacheKey(id);
    const liveAppointmentCacheData = await this.redisService.getJson<ILiveAppointmentCacheData>(cacheKey);

    if (!liveAppointmentCacheData) {
      throw new BadRequestException(EAppointmentErrorCodes.INVALID_DATA);
    }

    const { appointment } = liveAppointmentCacheData;

    const businessExtensionTime = await this.getRateForBusinessExtension(liveAppointmentCacheData);

    await this.queueInitializeService.addProcessPaymentOperationQueue(
      appointment.id,
      EPaymentOperation.AUTHORIZE_ADDITIONAL_BLOCK_PAYMENT,
      { isShortTimeSlot: false, additionalBlockDuration: businessExtensionTime },
    );

    return { message: "Success" };
  }

  private async getRateForBusinessExtension(liveAppointmentCacheData: ILiveAppointmentCacheData): Promise<number> {
    const CACHE_TTL = NUMBER_OF_MINUTES_IN_SIX_HOURS * NUMBER_OF_SECONDS_IN_MINUTE;
    const NUMBER_OF_REQUIRED_RATES: number = 2;

    const { appointment } = liveAppointmentCacheData;
    const cacheKey = `rates-calculation-extension:${appointment.interpreterType}:${appointment.schedulingType}:${appointment.communicationType}:${appointment.interpretingType}`;

    const whereConditions: FindOptionsWhere<Rate> = {
      interpreterType: appointment.interpreterType,
      schedulingType: appointment.schedulingType,
      communicationType: appointment.communicationType,
      interpretingType: appointment.interpretingType,
      detailsSequence: ERateDetailsSequence.ADDITIONAL_BLOCK,
    };

    let rates = await this.redisService.getJson<TRateForBusinessExtension[]>(cacheKey);

    if (!rates) {
      rates = await findManyTyped<TRateForBusinessExtension[]>(this.ratesRepository, {
        select: RateForBusinessExtension.select,
        where: [
          { ...whereConditions, qualifier: ERateQualifier.STANDARD_HOURS },
          { ...whereConditions, qualifier: ERateQualifier.AFTER_HOURS },
        ],
      });

      await this.redisService.setJson(cacheKey, rates, CACHE_TTL);
    }

    if (rates.length !== NUMBER_OF_REQUIRED_RATES) {
      throw new NotFoundException(EAppointmentErrorCodes.RATE_FOR_BUSINESS_EXTENSION_NOT_FOUND);
    }

    const standardRate = rates.find((rate) => rate.qualifier === ERateQualifier.STANDARD_HOURS);
    const afterHoursRate = rates.find((rate) => rate.qualifier === ERateQualifier.AFTER_HOURS);

    if (!standardRate || !afterHoursRate) {
      throw new NotFoundException(EAppointmentErrorCodes.STANDARD_OR_AFTER_HOURS_RATE_NOT_FOUND);
    }

    const timezone = appointment.interpreter?.timezone ?? appointment.timezone;
    const additionalBlockStart = liveAppointmentCacheData.extensionPeriodStart ?? new Date();
    const businessStartTime = toZonedTime(additionalBlockStart, timezone);

    const normalStart = applyRateTimeToDate(standardRate.normalHoursStart, businessStartTime);
    const normalEnd = applyRateTimeToDate(standardRate.normalHoursEnd, businessStartTime);

    let isInNormalHours: boolean;

    if (normalStart <= normalEnd) {
      isInNormalHours = businessStartTime >= normalStart && businessStartTime < normalEnd;
    } else {
      isInNormalHours = businessStartTime >= normalStart || businessStartTime < normalEnd;
    }

    return isInNormalHours ? standardRate.detailsTime : afterHoursRate.detailsTime;
  }

  public async updateAppointmentActivityTime(
    id: string,
    user: IWebSocketUserData,
    isViewConfirmed?: boolean,
  ): Promise<IAppointmentEndingMessageOutput | IMessageOutput> {
    if (!isUUID(id)) {
      throw new BadRequestException(EAppointmentErrorCodes.INVALID_APPOINTMENT_ID);
    }

    await this.appointmentRepository.update(
      { id, clientId: user.userRoleId, status: EAppointmentStatus.LIVE },
      { clientLastActiveTime: new Date() },
    );

    const message = await this.handleLiveAppointmentCacheData(id, isViewConfirmed);

    return message ? message : { message: "Success" };
  }

  private async handleLiveAppointmentCacheData(
    id: string,
    isViewConfirmed?: boolean,
  ): Promise<IAppointmentEndingMessageOutput | null> {
    const cacheKey = this.buildCacheKey(id);
    let liveAppointmentCacheData = await this.getCachedAppointmentData(cacheKey);

    if (!liveAppointmentCacheData) {
      liveAppointmentCacheData = await this.createCacheFromAppointment(id, cacheKey);

      if (!liveAppointmentCacheData) {
        return null;
      }
    }

    return await this.processNotificationIfNeeded(liveAppointmentCacheData, cacheKey, isViewConfirmed);
  }

  private buildCacheKey(appointmentId: string): string {
    return `live-appointment-data:${appointmentId}`;
  }

  private async getCachedAppointmentData(cacheKey: string): Promise<ILiveAppointmentCacheData | null> {
    return await this.redisService.getJson<ILiveAppointmentCacheData>(cacheKey);
  }

  private async createCacheFromAppointment(
    appointmentId: string,
    cacheKey: string,
  ): Promise<ILiveAppointmentCacheData | null> {
    const appointment = await findOneOrFailTyped<TLiveAppointmentCache>(appointmentId, this.appointmentRepository, {
      select: LiveAppointmentCacheQuery.select,
      where: { id: appointmentId, status: EAppointmentStatus.LIVE },
      relations: LiveAppointmentCacheQuery.relations,
    });

    if (!appointment.businessStartTime) {
      return null;
    }

    const cacheData: ILiveAppointmentCacheData = { appointment, isEndingSoonPushSent: false };
    const CACHE_TTL = NUMBER_OF_MINUTES_IN_THREE_QUARTERS_OF_HOUR * NUMBER_OF_SECONDS_IN_MINUTE;
    await this.redisService.setJson(cacheKey, cacheData, CACHE_TTL);

    return cacheData;
  }

  private async processNotificationIfNeeded(
    cacheData: ILiveAppointmentCacheData,
    cacheKey: string,
    isViewConfirmed?: boolean,
  ): Promise<IAppointmentEndingMessageOutput | null> {
    if (cacheData.isEndingSoonPushSent) {
      return null;
    }

    const notificationMessage = await this.handleSendLiveAppointmentEndingSoonNotification(cacheData.appointment);

    if (!notificationMessage) {
      return null;
    }

    await this.updateCacheWithNotificationSent(cacheData, cacheKey, isViewConfirmed);

    return isViewConfirmed ? null : notificationMessage;
  }

  private async handleSendLiveAppointmentEndingSoonNotification(
    appointment: TLiveAppointmentCache,
  ): Promise<IAppointmentEndingMessageOutput | null> {
    if (appointment.interpretingType === EAppointmentInterpretingType.SIMULTANEOUS) {
      return null;
    }

    const currentTime = new Date();
    const fiveMinutesLater = addMinutes(currentTime, NUMBER_OF_MINUTES_IN_FIVE_MINUTES);
    const threeMinutesLater = addMinutes(currentTime, NUMBER_OF_MINUTES_IN_THREE_MINUTES);

    if (appointment.businessEndTime) {
      const businessEndTime = new Date(appointment.businessEndTime);

      if (businessEndTime < threeMinutesLater) {
        return await this.sendLiveAppointmentEndingSoonNotification(appointment.id);
      }

      return null;
    }

    const estimatedScheduledEndTime = new Date(appointment.internalEstimatedEndTime);

    if (estimatedScheduledEndTime < fiveMinutesLater) {
      return await this.sendLiveAppointmentEndingSoonNotification(appointment.id);
    }

    return null;
  }

  private async sendLiveAppointmentEndingSoonNotification(
    appointmentId: string,
  ): Promise<IAppointmentEndingMessageOutput> {
    return {
      type: ENotificationDataType.APPOINTMENT_ENDING_SOON,
      appointmentId: appointmentId,
    };
  }

  private async updateCacheWithNotificationSent(
    cacheData: ILiveAppointmentCacheData,
    cacheKey: string,
    isViewConfirmed?: boolean,
  ): Promise<void> {
    const extensionPeriodStart =
      cacheData.appointment.businessEndTime ?? cacheData.appointment.internalEstimatedEndTime;
    const CACHE_TTL = NUMBER_OF_MINUTES_IN_THREE_QUARTERS_OF_HOUR * NUMBER_OF_SECONDS_IN_MINUTE;

    Object.assign(cacheData, {
      isEndingSoonPushSent: Boolean(isViewConfirmed),
      extensionPeriodStart: extensionPeriodStart,
    });

    await this.redisService.setJson(cacheKey, cacheData, CACHE_TTL);
  }
}
