/* eslint-disable @typescript-eslint/no-magic-numbers */
import { BadRequestException, Injectable } from "@nestjs/common";
import { EAppointmentCommunicationType } from "src/modules/appointments/appointment/common/enums";
import { ERepeatInterval } from "src/modules/appointment-orders/appointment-order/common/enum";
import {
  NUMBER_OF_DAYS_IN_HALF_YEAR,
  NUMBER_OF_DAYS_IN_MONTH,
  NUMBER_OF_DAYS_IN_TEN_DAYS,
  NUMBER_OF_DAYS_IN_THREE_DAYS,
  NUMBER_OF_DAYS_IN_WORK_WEEK,
  NUMBER_OF_HOURS_IN_DAY,
  NUMBER_OF_HOURS_IN_DAY_AND_HALF,
  NUMBER_OF_HOURS_IN_FIFTEEN_DAYS,
  NUMBER_OF_HOURS_IN_TWELVE_HOURS,
  NUMBER_OF_HOURS_IN_HOUR,
  NUMBER_OF_HOURS_IN_SIX_HOURS,
  NUMBER_OF_HOURS_IN_TEN_HOURS,
  NUMBER_OF_HOURS_IN_THREE_HOURS,
  NUMBER_OF_HOURS_IN_EIGHTEEN_HOURS,
  NUMBER_OF_HOURS_IN_TWO_DAYS,
  NUMBER_OF_HOURS_IN_TWO_HOURS,
  NUMBER_OF_HOURS_IN_WEEK,
  NUMBER_OF_MILLISECONDS_IN_HOUR,
  NUMBER_OF_MILLISECONDS_IN_MINUTE,
  NUMBER_OF_MINUTES_IN_FIVE_MINUTES,
  NUMBER_OF_MINUTES_IN_HALF_HOUR,
  NUMBER_OF_MINUTES_IN_HOUR,
  NUMBER_OF_MINUTES_IN_QUARTER_HOUR,
  NUMBER_OF_MINUTES_IN_THREE_MINUTES,
  NUMBER_OF_MINUTES_IN_THREE_QUARTERS_OF_HOUR,
  NUMBER_OF_MINUTES_IN_TWENTY_MINUTES,
} from "src/common/constants";
import {
  EAppointmentCombinationType,
  EAppointmentOrderSharedErrorCodes,
  ETimeFrameCategory,
} from "src/modules/appointment-orders/shared/common/enum";
import { ITimeFrame, ITimeFrames } from "src/modules/appointment-orders/shared/common/interface";
import { AUDIO_VIDEO_COMMUNICATION_TYPES } from "src/modules/appointments/shared/common/constants";

@Injectable()
export class SearchTimeFrameService {
  public async calculateInitialTimeFrames(
    communicationType: EAppointmentCommunicationType,
    scheduledStartTime: Date,
  ): Promise<ITimeFrames> {
    const currentTime = new Date();
    const appointmentType = this.determineAppointmentType(communicationType);
    const timeCategory = this.determineTimeCategory(scheduledStartTime, appointmentType, currentTime);

    const { nextRepeatTime, repeatInterval, remainingRepeats } = this.calculateInitialRepeatTime(
      appointmentType,
      currentTime,
      timeCategory,
    );
    const notifyAdmin = this.calculateNotifyAdminTime(appointmentType, currentTime, timeCategory);
    const endSearchTime = this.calculateEndSearchTime(appointmentType, currentTime, timeCategory);

    return { nextRepeatTime, repeatInterval, remainingRepeats, notifyAdmin, endSearchTime };
  }

  private determineAppointmentType(communicationType: EAppointmentCommunicationType): EAppointmentCombinationType {
    if (AUDIO_VIDEO_COMMUNICATION_TYPES.includes(communicationType)) {
      return EAppointmentCombinationType.VIDEO_AUDIO;
    } else {
      return EAppointmentCombinationType.FACE_TO_FACE;
    }
  }

  private determineTimeCategory(
    scheduledStartTime: Date,
    appointmentType: EAppointmentCombinationType,
    currentTime: Date,
  ): ETimeFrameCategory {
    const timeUntilAppointment = new Date(scheduledStartTime).getTime() - currentTime.getTime();
    const minutesUntilAppointment = timeUntilAppointment / NUMBER_OF_MILLISECONDS_IN_MINUTE;
    const hoursUntilAppointment = minutesUntilAppointment / NUMBER_OF_MINUTES_IN_HOUR;
    const daysUntilAppointment = hoursUntilAppointment / NUMBER_OF_HOURS_IN_DAY;

    if (appointmentType === EAppointmentCombinationType.VIDEO_AUDIO) {
      if (daysUntilAppointment > NUMBER_OF_DAYS_IN_MONTH && daysUntilAppointment <= NUMBER_OF_DAYS_IN_HALF_YEAR) {
        return ETimeFrameCategory.SIX_MONTHS_TO_ONE_MONTH;
      } else if (
        daysUntilAppointment > NUMBER_OF_DAYS_IN_THREE_DAYS &&
        daysUntilAppointment <= NUMBER_OF_DAYS_IN_MONTH
      ) {
        return ETimeFrameCategory.ONE_MONTH_TO_THREE_DAYS;
      } else if (
        hoursUntilAppointment > NUMBER_OF_HOURS_IN_SIX_HOURS &&
        daysUntilAppointment <= NUMBER_OF_DAYS_IN_THREE_DAYS
      ) {
        return ETimeFrameCategory.THREE_DAYS_TO_SIX_HOURS;
      } else if (
        hoursUntilAppointment > NUMBER_OF_HOURS_IN_HOUR &&
        hoursUntilAppointment <= NUMBER_OF_HOURS_IN_SIX_HOURS
      ) {
        return ETimeFrameCategory.SIX_HOURS_TO_ONE_HOUR;
      } else if (hoursUntilAppointment <= NUMBER_OF_HOURS_IN_HOUR) {
        return ETimeFrameCategory.ON_DEMAND;
      }
    } else {
      if (daysUntilAppointment > NUMBER_OF_DAYS_IN_MONTH && daysUntilAppointment <= NUMBER_OF_DAYS_IN_HALF_YEAR) {
        return ETimeFrameCategory.SIX_MONTHS_TO_ONE_MONTH;
      } else if (
        daysUntilAppointment > NUMBER_OF_DAYS_IN_THREE_DAYS &&
        daysUntilAppointment <= NUMBER_OF_DAYS_IN_MONTH
      ) {
        return ETimeFrameCategory.ONE_MONTH_TO_THREE_DAYS;
      } else if (
        hoursUntilAppointment > NUMBER_OF_HOURS_IN_EIGHTEEN_HOURS &&
        daysUntilAppointment <= NUMBER_OF_DAYS_IN_THREE_DAYS
      ) {
        return ETimeFrameCategory.THREE_DAYS_TO_EIGHTEEN_HOURS;
      } else if (
        hoursUntilAppointment > NUMBER_OF_HOURS_IN_THREE_HOURS &&
        hoursUntilAppointment <= NUMBER_OF_HOURS_IN_EIGHTEEN_HOURS
      ) {
        return ETimeFrameCategory.EIGHTEEN_HOURS_TO_THREE_HOURS;
      } else if (hoursUntilAppointment <= NUMBER_OF_HOURS_IN_THREE_HOURS) {
        return ETimeFrameCategory.ON_DEMAND;
      }
    }

    throw new BadRequestException(EAppointmentOrderSharedErrorCodes.UNABLE_TO_DETERMINE_TIME_CATEGORY);
  }

  private calculateInitialRepeatTime(
    appointmentType: EAppointmentCombinationType,
    currentTime: Date,
    timeCategory: ETimeFrameCategory,
  ): ITimeFrame {
    let intervalMinutes: number | null = null;
    let repeatInterval: ERepeatInterval = ERepeatInterval.NO_REPEAT;
    let remainingRepeats: number = 0;

    if (appointmentType === EAppointmentCombinationType.VIDEO_AUDIO) {
      switch (timeCategory) {
        case ETimeFrameCategory.SIX_MONTHS_TO_ONE_MONTH:
          intervalMinutes = NUMBER_OF_HOURS_IN_DAY * NUMBER_OF_MINUTES_IN_HOUR;
          repeatInterval = ERepeatInterval.EVERY_DAY;
          remainingRepeats = 6;
          break;
        case ETimeFrameCategory.ONE_MONTH_TO_THREE_DAYS:
          intervalMinutes = NUMBER_OF_HOURS_IN_SIX_HOURS * NUMBER_OF_MINUTES_IN_HOUR;
          repeatInterval = ERepeatInterval.EVERY_6_HOURS;
          remainingRepeats = 7;
          break;
        case ETimeFrameCategory.THREE_DAYS_TO_SIX_HOURS:
          intervalMinutes = NUMBER_OF_MINUTES_IN_HALF_HOUR;
          repeatInterval = ERepeatInterval.EVERY_30_MINUTES;
          remainingRepeats = 5;
          break;
        case ETimeFrameCategory.SIX_HOURS_TO_ONE_HOUR:
          intervalMinutes = NUMBER_OF_MINUTES_IN_FIVE_MINUTES;
          repeatInterval = ERepeatInterval.EVERY_5_MINUTES;
          remainingRepeats = 5;
          break;
        case ETimeFrameCategory.ON_DEMAND:
          intervalMinutes = null;
          repeatInterval = ERepeatInterval.NO_REPEAT;
          remainingRepeats = 0;
          break;
      }
    } else {
      switch (timeCategory) {
        case ETimeFrameCategory.SIX_MONTHS_TO_ONE_MONTH:
          intervalMinutes = NUMBER_OF_HOURS_IN_DAY * NUMBER_OF_MINUTES_IN_HOUR;
          repeatInterval = ERepeatInterval.EVERY_DAY;
          remainingRepeats = 14;
          break;
        case ETimeFrameCategory.ONE_MONTH_TO_THREE_DAYS:
          intervalMinutes = NUMBER_OF_HOURS_IN_SIX_HOURS * NUMBER_OF_MINUTES_IN_HOUR;
          repeatInterval = ERepeatInterval.EVERY_6_HOURS;
          remainingRepeats = 7;
          break;
        case ETimeFrameCategory.THREE_DAYS_TO_EIGHTEEN_HOURS:
          intervalMinutes = NUMBER_OF_HOURS_IN_TWO_HOURS * NUMBER_OF_MINUTES_IN_HOUR;
          repeatInterval = ERepeatInterval.EVERY_2_HOURS;
          remainingRepeats = 5;
          break;
        case ETimeFrameCategory.EIGHTEEN_HOURS_TO_THREE_HOURS:
          intervalMinutes = NUMBER_OF_MINUTES_IN_QUARTER_HOUR;
          repeatInterval = ERepeatInterval.EVERY_15_MINUTES;
          remainingRepeats = 3;
          break;
        case ETimeFrameCategory.ON_DEMAND:
          intervalMinutes = NUMBER_OF_MINUTES_IN_FIVE_MINUTES;
          repeatInterval = ERepeatInterval.EVERY_5_MINUTES;
          remainingRepeats = 11;
          break;
      }
    }

    if (intervalMinutes !== null) {
      return {
        nextRepeatTime: new Date(currentTime.getTime() + intervalMinutes * NUMBER_OF_MILLISECONDS_IN_MINUTE),
        repeatInterval,
        remainingRepeats,
      };
    } else {
      return { nextRepeatTime: null, repeatInterval, remainingRepeats };
    }
  }

  private calculateNotifyAdminTime(
    appointmentType: EAppointmentCombinationType,
    currentTime: Date,
    timeCategory: ETimeFrameCategory,
  ): Date {
    let delayMinutes: number;

    if (appointmentType === EAppointmentCombinationType.VIDEO_AUDIO) {
      switch (timeCategory) {
        case ETimeFrameCategory.SIX_MONTHS_TO_ONE_MONTH:
          delayMinutes = NUMBER_OF_DAYS_IN_WORK_WEEK * NUMBER_OF_HOURS_IN_DAY * NUMBER_OF_MINUTES_IN_HOUR;
          break;
        case ETimeFrameCategory.ONE_MONTH_TO_THREE_DAYS:
          delayMinutes = NUMBER_OF_HOURS_IN_DAY_AND_HALF * NUMBER_OF_MINUTES_IN_HOUR;
          break;
        case ETimeFrameCategory.THREE_DAYS_TO_SIX_HOURS:
          delayMinutes = NUMBER_OF_HOURS_IN_TWO_HOURS * NUMBER_OF_MINUTES_IN_HOUR;
          break;
        case ETimeFrameCategory.SIX_HOURS_TO_ONE_HOUR:
          delayMinutes = NUMBER_OF_MINUTES_IN_TWENTY_MINUTES;
          break;
        case ETimeFrameCategory.ON_DEMAND:
          delayMinutes = NUMBER_OF_MINUTES_IN_THREE_MINUTES;
          break;
        default:
          throw new BadRequestException(EAppointmentOrderSharedErrorCodes.UNSUPPORTED_TIME_CATEGORY);
      }
    } else {
      switch (timeCategory) {
        case ETimeFrameCategory.SIX_MONTHS_TO_ONE_MONTH:
          delayMinutes = NUMBER_OF_DAYS_IN_TEN_DAYS * NUMBER_OF_HOURS_IN_DAY * NUMBER_OF_MINUTES_IN_HOUR;
          break;
        case ETimeFrameCategory.ONE_MONTH_TO_THREE_DAYS:
          delayMinutes = NUMBER_OF_HOURS_IN_DAY_AND_HALF * NUMBER_OF_MINUTES_IN_HOUR;
          break;
        case ETimeFrameCategory.THREE_DAYS_TO_EIGHTEEN_HOURS:
          delayMinutes = NUMBER_OF_HOURS_IN_TEN_HOURS * NUMBER_OF_MINUTES_IN_HOUR;
          break;
        case ETimeFrameCategory.EIGHTEEN_HOURS_TO_THREE_HOURS:
          delayMinutes = NUMBER_OF_MINUTES_IN_HALF_HOUR;
          break;
        case ETimeFrameCategory.ON_DEMAND:
          delayMinutes = NUMBER_OF_MINUTES_IN_THREE_QUARTERS_OF_HOUR;
          break;
        default:
          throw new BadRequestException(EAppointmentOrderSharedErrorCodes.UNSUPPORTED_TIME_CATEGORY);
      }
    }

    return new Date(currentTime.getTime() + delayMinutes * NUMBER_OF_MILLISECONDS_IN_MINUTE);
  }

  private calculateEndSearchTime(
    appointmentType: EAppointmentCombinationType,
    currentTime: Date,
    timeCategory: ETimeFrameCategory,
  ): Date {
    let endTime: Date;

    if (appointmentType === EAppointmentCombinationType.VIDEO_AUDIO) {
      switch (timeCategory) {
        case ETimeFrameCategory.SIX_MONTHS_TO_ONE_MONTH:
          endTime = new Date(currentTime.getTime() + NUMBER_OF_HOURS_IN_WEEK * NUMBER_OF_MILLISECONDS_IN_HOUR);
          break;
        case ETimeFrameCategory.ONE_MONTH_TO_THREE_DAYS:
          endTime = new Date(currentTime.getTime() + NUMBER_OF_HOURS_IN_TWO_DAYS * NUMBER_OF_MILLISECONDS_IN_HOUR);
          break;
        case ETimeFrameCategory.THREE_DAYS_TO_SIX_HOURS:
          endTime = new Date(currentTime.getTime() + NUMBER_OF_HOURS_IN_THREE_HOURS * NUMBER_OF_MILLISECONDS_IN_HOUR);
          break;
        case ETimeFrameCategory.SIX_HOURS_TO_ONE_HOUR:
          endTime = new Date(currentTime.getTime() + NUMBER_OF_MINUTES_IN_HALF_HOUR * NUMBER_OF_MILLISECONDS_IN_MINUTE);
          break;
        case ETimeFrameCategory.ON_DEMAND:
          endTime = new Date(
            currentTime.getTime() + NUMBER_OF_MINUTES_IN_FIVE_MINUTES * NUMBER_OF_MILLISECONDS_IN_MINUTE,
          );
          break;
        default:
          throw new BadRequestException(EAppointmentOrderSharedErrorCodes.UNSUPPORTED_TIME_CATEGORY);
      }
    } else {
      switch (timeCategory) {
        case ETimeFrameCategory.SIX_MONTHS_TO_ONE_MONTH:
          endTime = new Date(currentTime.getTime() + NUMBER_OF_HOURS_IN_FIFTEEN_DAYS * NUMBER_OF_MILLISECONDS_IN_HOUR);
          break;
        case ETimeFrameCategory.ONE_MONTH_TO_THREE_DAYS:
          endTime = new Date(currentTime.getTime() + NUMBER_OF_HOURS_IN_TWO_DAYS * NUMBER_OF_MILLISECONDS_IN_HOUR);
          break;
        case ETimeFrameCategory.THREE_DAYS_TO_EIGHTEEN_HOURS:
          endTime = new Date(currentTime.getTime() + NUMBER_OF_HOURS_IN_TWELVE_HOURS * NUMBER_OF_MILLISECONDS_IN_HOUR);
          break;
        case ETimeFrameCategory.EIGHTEEN_HOURS_TO_THREE_HOURS:
          endTime = new Date(currentTime.getTime() + NUMBER_OF_MILLISECONDS_IN_HOUR);
          break;
        case ETimeFrameCategory.ON_DEMAND:
          endTime = new Date(currentTime.getTime() + NUMBER_OF_MILLISECONDS_IN_HOUR);
          break;
        default:
          throw new BadRequestException(EAppointmentOrderSharedErrorCodes.UNSUPPORTED_TIME_CATEGORY);
      }
    }

    return endTime;
  }

  public async calculateNextRepeatTime(currentTime: Date, repeatInterval: ERepeatInterval): Promise<Date> {
    let intervalMinutes: number = 0;

    switch (repeatInterval) {
      case ERepeatInterval.EVERY_DAY:
        intervalMinutes = NUMBER_OF_HOURS_IN_DAY * NUMBER_OF_MINUTES_IN_HOUR;
        break;
      case ERepeatInterval.EVERY_6_HOURS:
        intervalMinutes = NUMBER_OF_HOURS_IN_SIX_HOURS * NUMBER_OF_MINUTES_IN_HOUR;
        break;
      case ERepeatInterval.EVERY_2_HOURS:
        intervalMinutes = NUMBER_OF_HOURS_IN_TWO_HOURS * NUMBER_OF_MINUTES_IN_HOUR;
        break;
      case ERepeatInterval.EVERY_30_MINUTES:
        intervalMinutes = NUMBER_OF_MINUTES_IN_HALF_HOUR;
        break;
      case ERepeatInterval.EVERY_15_MINUTES:
        intervalMinutes = NUMBER_OF_MINUTES_IN_QUARTER_HOUR;
        break;
      case ERepeatInterval.EVERY_5_MINUTES:
        intervalMinutes = NUMBER_OF_MINUTES_IN_FIVE_MINUTES;
        break;
    }

    return new Date(currentTime.getTime() + intervalMinutes * NUMBER_OF_MILLISECONDS_IN_MINUTE);
  }
}
