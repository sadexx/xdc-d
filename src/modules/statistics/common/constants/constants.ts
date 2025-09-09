import { EAppointmentType, EInterpreterAppointmentCriteria } from "src/modules/statistics/common/enums";
import {
  EAppointmentCommunicationType,
  EAppointmentInterpretingType,
  EAppointmentSchedulingType,
} from "src/modules/appointments/appointment/common/enums";
import { IAppointmentTypeCriteria } from "src/modules/statistics/common/interfaces";
import { UNDEFINED_VALUE } from "src/common/constants";

export const ADMIN_INTERPRETER_CRITERIA = [
  EInterpreterAppointmentCriteria.AT_LEAST_ONE_COMPLETED_APPOINTMENT_PER_DAY,
  EInterpreterAppointmentCriteria.AT_LEAST_3_COMPLETED_APPOINTMENT_PER_DAY,
  EInterpreterAppointmentCriteria.AT_LEAST_5_COMPLETED_APPOINTMENT_PER_DAY,
  EInterpreterAppointmentCriteria.AT_LEAST_10_COMPLETED_APPOINTMENT_PER_DAY,
] as const;

export const APPOINTMENT_TYPE_CRITERIA: {
  [key in EAppointmentType]: IAppointmentTypeCriteria;
} = {
  [EAppointmentType.ALL]: {
    communicationType: UNDEFINED_VALUE,
    schedulingType: UNDEFINED_VALUE,
  },
  [EAppointmentType.AUDIO_ON_DEMAND]: {
    communicationType: EAppointmentCommunicationType.AUDIO,
    schedulingType: EAppointmentSchedulingType.ON_DEMAND,
  },
  [EAppointmentType.VIDEO_ON_DEMAND]: {
    communicationType: EAppointmentCommunicationType.VIDEO,
    schedulingType: EAppointmentSchedulingType.ON_DEMAND,
  },
  [EAppointmentType.F2F_ON_DEMAND]: {
    communicationType: EAppointmentCommunicationType.FACE_TO_FACE,
    schedulingType: EAppointmentSchedulingType.ON_DEMAND,
  },
  [EAppointmentType.AUDIO_PRE_BOOKED]: {
    communicationType: EAppointmentCommunicationType.AUDIO,
    schedulingType: EAppointmentSchedulingType.PRE_BOOKED,
  },
  [EAppointmentType.VIDEO_PRE_BOOKED]: {
    communicationType: EAppointmentCommunicationType.VIDEO,
    schedulingType: EAppointmentSchedulingType.PRE_BOOKED,
  },
  [EAppointmentType.F2F_PRE_BOOKED]: {
    communicationType: EAppointmentCommunicationType.FACE_TO_FACE,
    schedulingType: EAppointmentSchedulingType.PRE_BOOKED,
  },
};

export const APPOINTMENT_INTERPRETING_CRITERIA: {
  all?: undefined;
} & {
  [key in EAppointmentInterpretingType]?: EAppointmentInterpretingType;
} = {
  all: UNDEFINED_VALUE,
  [EAppointmentInterpretingType.CONSECUTIVE]: EAppointmentInterpretingType.CONSECUTIVE,
  [EAppointmentInterpretingType.SIMULTANEOUS]: EAppointmentInterpretingType.SIMULTANEOUS,
  [EAppointmentInterpretingType.SIGN_LANGUAGE]: EAppointmentInterpretingType.SIGN_LANGUAGE,
  [EAppointmentInterpretingType.ESCORT]: EAppointmentInterpretingType.ESCORT,
};
