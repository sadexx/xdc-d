import {
  EAppointmentCommunicationType,
  EAppointmentInterpreterType,
  EAppointmentInterpretingType,
  EAppointmentSchedulingType,
} from "src/modules/appointments/appointment/common/enums";
import { ERateDetailsSequence, ERateQualifier } from "src/modules/rates/common/enums";
import { TRateTiming, TimeString } from "src/modules/rates/common/types";

export interface IConvertedRate {
  readonly id: string;
  readonly quantity: number;
  readonly interpreterType: EAppointmentInterpreterType;
  readonly schedulingType: EAppointmentSchedulingType;
  readonly communicationType: EAppointmentCommunicationType;
  readonly interpretingType: EAppointmentInterpretingType;
  readonly qualifier: ERateQualifier;
  readonly details: TRateTiming;
  readonly detailsSequence: ERateDetailsSequence;
  readonly detailsTime: number;
  readonly normalHoursStart: TimeString;
  readonly normalHoursEnd: TimeString;
  readonly paidByTakerGeneralWithGst: number;
  readonly paidByTakerGeneralWithoutGst: number;
  readonly paidByTakerSpecialWithGst: number | null;
  readonly paidByTakerSpecialWithoutGst: number | null;
  readonly lfhCommissionGeneral: number;
  readonly lfhCommissionSpecial: number | null;
  readonly paidToInterpreterGeneralWithGst: number;
  readonly paidToInterpreterGeneralWithoutGst: number;
  readonly paidToInterpreterSpecialWithGst: number | null;
  readonly paidToInterpreterSpecialWithoutGst: number | null;
  readonly paidByTakerGeneralWithGstPerMinute: number;
  readonly paidByTakerGeneralWithoutGstPerMinute: number;
  readonly paidByTakerSpecialWithGstPerMinute: number | null;
  readonly paidByTakerSpecialWithoutGstPerMinute: number | null;
  readonly lfhCommissionGeneralPerMinute: number;
  readonly lfhCommissionSpecialPerMinute: number | null;
  readonly paidToInterpreterGeneralWithGstPerMinute: number;
  readonly paidToInterpreterGeneralWithoutGstPerMinute: number;
  readonly paidToInterpreterSpecialWithGstPerMinute: number | null;
  readonly paidToInterpreterSpecialWithoutGstPerMinute: number | null;
  readonly creationDate: Date;
  readonly updatingDate: Date;
}
