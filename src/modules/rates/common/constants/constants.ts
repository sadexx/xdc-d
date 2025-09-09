import {
  EAppointmentCommunicationType,
  EAppointmentInterpretingType,
  EAppointmentSchedulingType,
} from "src/modules/appointments/appointment/common/enums";
import { ERateDetailsSequence, ERateDetailsTime, ERateTiming } from "src/modules/rates/common/enums";
import { TimeString } from "src/modules/rates/common/types";

export const STANDARD_RATE_HOUR_START: TimeString = "09:00:00";
export const STANDARD_RATE_HOUR_END: TimeString = "18:00:00";
export const MIN_RATE_BLOCK_DURATION_MINUTES: number = 5;
export const STANDARD_RATE_HOUR_START_NUMBER: number = 9;
export const STANDARD_RATE_HOUR_END_NUMBER: number = 18;
export const DECIMAL_PRECISION_FOR_RATES: number = 12;

export const ON_DEMAND_AUDIO_CONSECUTIVE_PARAMS = {
  schedulingType: EAppointmentSchedulingType.ON_DEMAND,
  communicationType: EAppointmentCommunicationType.AUDIO,
  interpretingType: EAppointmentInterpretingType.CONSECUTIVE,
} as const;

export const ON_DEMAND_VIDEO_CONSECUTIVE_PARAMS = {
  schedulingType: EAppointmentSchedulingType.ON_DEMAND,
  communicationType: EAppointmentCommunicationType.VIDEO,
  interpretingType: EAppointmentInterpretingType.CONSECUTIVE,
} as const;

export const PRE_BOOKED_AUDIO_CONSECUTIVE_PARAMS = {
  schedulingType: EAppointmentSchedulingType.PRE_BOOKED,
  communicationType: EAppointmentCommunicationType.AUDIO,
  interpretingType: EAppointmentInterpretingType.CONSECUTIVE,
} as const;

export const PRE_BOOKED_VIDEO_CONSECUTIVE_PARAMS = {
  schedulingType: EAppointmentSchedulingType.PRE_BOOKED,
  communicationType: EAppointmentCommunicationType.VIDEO,
  interpretingType: EAppointmentInterpretingType.CONSECUTIVE,
} as const;

export const ON_DEMAND_FACE_TO_FACE_CONSECUTIVE_PARAMS = {
  schedulingType: EAppointmentSchedulingType.ON_DEMAND,
  communicationType: EAppointmentCommunicationType.FACE_TO_FACE,
  interpretingType: EAppointmentInterpretingType.CONSECUTIVE,
} as const;

export const PRE_BOOKED_FACE_TO_FACE_CONSECUTIVE_PARAMS = {
  schedulingType: EAppointmentSchedulingType.PRE_BOOKED,
  communicationType: EAppointmentCommunicationType.FACE_TO_FACE,
  interpretingType: EAppointmentInterpretingType.CONSECUTIVE,
} as const;

export const PRE_BOOKED_FACE_TO_FACE_SIGN_LANGUAGE_PARAMS = {
  schedulingType: EAppointmentSchedulingType.PRE_BOOKED,
  communicationType: EAppointmentCommunicationType.FACE_TO_FACE,
  interpretingType: EAppointmentInterpretingType.SIGN_LANGUAGE,
} as const;

export const ON_DEMAND_FACE_TO_FACE_SIGN_LANGUAGE_PARAMS = {
  schedulingType: EAppointmentSchedulingType.ON_DEMAND,
  communicationType: EAppointmentCommunicationType.FACE_TO_FACE,
  interpretingType: EAppointmentInterpretingType.SIGN_LANGUAGE,
} as const;

export const PRE_BOOKED_VIDEO_SIGN_LANGUAGE_PARAMS = {
  schedulingType: EAppointmentSchedulingType.PRE_BOOKED,
  communicationType: EAppointmentCommunicationType.VIDEO,
  interpretingType: EAppointmentInterpretingType.SIGN_LANGUAGE,
} as const;

export const ON_DEMAND_VIDEO_SIGN_LANGUAGE_PARAMS = {
  schedulingType: EAppointmentSchedulingType.ON_DEMAND,
  communicationType: EAppointmentCommunicationType.VIDEO,
  interpretingType: EAppointmentInterpretingType.SIGN_LANGUAGE,
} as const;

export const RATE_UP_TO_THE_FIRST_15_MINUTES_DETAILS = {
  details: ERateTiming.UP_TO_THE_FIRST_15_MINUTES,
  detailsSequence: ERateDetailsSequence.FIRST_MINUTES,
  detailsTime: ERateDetailsTime.FIFTEEN,
} as const;

export const RATE_UP_TO_5_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS = {
  details: ERateTiming.UP_TO_5_MINUTES_EACH_ADDITIONAL_BLOCK,
  detailsSequence: ERateDetailsSequence.ADDITIONAL_BLOCK,
  detailsTime: ERateDetailsTime.FIVE,
} as const;

export const RATE_UP_TO_THE_FIRST_30_MINUTES_DETAILS = {
  details: ERateTiming.UP_TO_THE_FIRST_30_MINUTES,
  detailsSequence: ERateDetailsSequence.FIRST_MINUTES,
  detailsTime: ERateDetailsTime.THIRTY,
} as const;

export const RATE_UP_TO_THE_FIRST_90_MINUTES_DETAILS = {
  details: ERateTiming.UP_TO_THE_FIRST_90_MINUTES,
  detailsSequence: ERateDetailsSequence.FIRST_MINUTES,
  detailsTime: ERateDetailsTime.NINETY,
} as const;

export const RATE_UP_TO_10_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS = {
  details: ERateTiming.UP_TO_10_MINUTES_EACH_ADDITIONAL_BLOCK,
  detailsSequence: ERateDetailsSequence.ADDITIONAL_BLOCK,
  detailsTime: ERateDetailsTime.TEN,
} as const;

export const RATE_UP_TO_THE_FIRST_120_MINUTES_DETAILS = {
  details: ERateTiming.UP_TO_THE_FIRST_120_MINUTES,
  detailsSequence: ERateDetailsSequence.FIRST_MINUTES,
  detailsTime: ERateDetailsTime.TWO_HOURS,
} as const;

export const RATE_UP_TO_60_MINUTES_EACH_ADDITIONAL_BLOCK_DETAILS = {
  details: ERateTiming.UP_TO_60_MINUTES_EACH_ADDITIONAL_BLOCK,
  detailsSequence: ERateDetailsSequence.ADDITIONAL_BLOCK,
  detailsTime: ERateDetailsTime.ONE_HOUR,
};

export const RATE_UP_TO_THE_FIRST_60_MINUTES_DETAILS = {
  details: ERateTiming.UP_TO_THE_FIRST_60_MINUTES,
  detailsSequence: ERateDetailsSequence.FIRST_MINUTES,
  detailsTime: ERateDetailsTime.ONE_HOUR,
} as const;
