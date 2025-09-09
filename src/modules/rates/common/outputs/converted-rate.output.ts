import { ERateDetailsSequence, ERateQualifier } from "src/modules/rates/common/enums";
import {
  EAppointmentCommunicationType,
  EAppointmentInterpreterType,
  EAppointmentInterpretingType,
  EAppointmentSchedulingType,
} from "src/modules/appointments/appointment/common/enums";
import { TRateTiming, TimeString } from "src/modules/rates/common/types";

export interface IConvertedRateOutput {
  id: string;
  quantity: number;
  interpreterType: EAppointmentInterpreterType;
  schedulingType: EAppointmentSchedulingType;
  communicationType: EAppointmentCommunicationType;
  interpretingType: EAppointmentInterpretingType;
  qualifier: ERateQualifier;
  details: TRateTiming;
  detailsSequence: ERateDetailsSequence;
  detailsTime: number;
  normalHoursStart: TimeString;
  normalHoursEnd: TimeString;
  paidByTakerGeneralWithGst: number;
  paidByTakerGeneralWithoutGst: number;
  paidByTakerSpecialWithGst: number | null;
  paidByTakerSpecialWithoutGst: number | null;
  lfhCommissionGeneral: number;
  lfhCommissionSpecial: number | null;
  paidToInterpreterGeneralWithGst: number;
  paidToInterpreterGeneralWithoutGst: number;
  paidToInterpreterSpecialWithGst: number | null;
  paidToInterpreterSpecialWithoutGst: number | null;
}
