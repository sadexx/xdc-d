import {
  EAppointmentInterpreterType,
  EAppointmentSchedulingType,
  EAppointmentCommunicationType,
  EAppointmentInterpretingType,
  EAppointmentTopic,
} from "src/modules/appointments/appointment/common/enums";
import { IDiscountRate } from "src/modules/discounts/common/interfaces";
import { ECalculationType, ETimeCalculationMode } from "src/modules/rates/common/enums";
import { CalculatePriceExtraDayDto } from "src/modules/rates/common/dto";

export interface CalculationConfig {
  readonly calculationType: ECalculationType;
  readonly timeCalculationMode?: ETimeCalculationMode;
  readonly includeAuditSteps: boolean;
  readonly interpreterType: EAppointmentInterpreterType;
  readonly schedulingType: EAppointmentSchedulingType;
  readonly communicationType: EAppointmentCommunicationType;
  readonly interpretingType: EAppointmentInterpretingType;
  readonly topic: EAppointmentTopic;
  duration: number;
  scheduleDateTime: string;
  readonly acceptedOvertime: boolean;
  readonly interpreterTimezone?: string;
  readonly clientTimezone?: string;
  readonly isExternalInterpreter?: boolean;
  isEscortOrSimultaneous?: boolean;
  readonly extraDays?: CalculatePriceExtraDayDto[];
  readonly includeDiscounts: boolean;
  readonly discounts?: IDiscountRate;
  readonly clientIsGstPayer: boolean;
  readonly interpreterIsGstPayer: boolean;
}
