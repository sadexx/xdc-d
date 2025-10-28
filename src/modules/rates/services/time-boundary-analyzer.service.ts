import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { addMinutes, parseISO } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { EAppointmentInterpretingType } from "src/modules/appointments/appointment/common/enums";
import {
  BoundaryTimeDetails,
  CalculationConfig,
  CombinedScenario,
  TimeAnalysis,
  TimeBoundaryResult,
} from "src/modules/rates/common/interfaces";
import { ECalculationType, ERatesErrorCodes, ETimeCalculationMode } from "src/modules/rates/common/enums";
import { applyRateTimeToDate, determineTimeCalculationMode } from "src/modules/rates/common/utils";
import { TRateCollection, TimeString } from "src/modules/rates/common/types";
import { LokiLogger } from "src/common/logger";

@Injectable()
export class TimeBoundaryAnalyzerService {
  private readonly lokiLogger = new LokiLogger(TimeBoundaryAnalyzerService.name);

  public analyzeTimeScenario(config: CalculationConfig, rates: TRateCollection): TimeBoundaryResult {
    const { normalHoursStart, normalHoursEnd } = this.extractAndValidateNormalHours(rates);

    const needsDualAnalysis = this.needsDualTimezoneAnalysis(config);

    if (!needsDualAnalysis) {
      return this.createSingleTimezoneResult(config, normalHoursStart, normalHoursEnd);
    }

    return this.createDualTimezoneResult(config, normalHoursStart, normalHoursEnd);
  }

  private needsDualTimezoneAnalysis(config: CalculationConfig): boolean {
    const simpleCalculationTypes: ECalculationType[] = [
      ECalculationType.PRELIMINARY_ESTIMATE,
      ECalculationType.APPOINTMENT_START_PRICE,
    ];

    const simpleInterpretingTypes: EAppointmentInterpretingType[] = [
      EAppointmentInterpretingType.ESCORT,
      EAppointmentInterpretingType.SIMULTANEOUS,
    ];

    const isAdminOverride =
      config.timeCalculationMode && config.calculationType === ECalculationType.DETAILED_BREAKDOWN;

    return (
      !simpleCalculationTypes.includes(config.calculationType) &&
      !simpleInterpretingTypes.includes(config.interpretingType) &&
      !isAdminOverride
    );
  }

  private createSingleTimezoneResult(
    config: CalculationConfig,
    normalHoursStart: TimeString,
    normalHoursEnd: TimeString,
  ): TimeBoundaryResult {
    const combinedScenario = this.determineSingleTimezoneMode(config);

    const clientBoundary = this.determineTimeBoundary(
      config.scheduleDateTime,
      config.duration,
      normalHoursStart,
      normalHoursEnd,
      config.clientTimezone,
    );

    return {
      type: "client-time-boundary",
      client: clientBoundary,
      interpreter: clientBoundary,
      combinedScenario,
    };
  }

  private createDualTimezoneResult(
    config: CalculationConfig,
    normalHoursStart: TimeString,
    normalHoursEnd: TimeString,
  ): TimeBoundaryResult {
    const clientBoundary = this.determineTimeBoundary(
      config.scheduleDateTime,
      config.duration,
      normalHoursStart,
      normalHoursEnd,
      config.clientTimezone,
    );

    const interpreterTimezone = config.isExternalInterpreter ? config.clientTimezone : config.interpreterTimezone;

    const interpreterBoundary = this.determineTimeBoundary(
      config.scheduleDateTime,
      config.duration,
      normalHoursStart,
      normalHoursEnd,
      interpreterTimezone,
    );

    const combinedScenario = this.determineDualTimezoneMode(config, interpreterBoundary);

    return {
      type: "dual-time-boundary",
      client: clientBoundary,
      interpreter: interpreterBoundary,
      combinedScenario,
    };
  }

  private determineSingleTimezoneMode(config: CalculationConfig): CombinedScenario {
    if (config.isEscortOrSimultaneous) {
      return this.createCombinedScenario(ETimeCalculationMode.NORMAL, ETimeCalculationMode.NORMAL, false);
    }

    if (config.timeCalculationMode && config.calculationType === ECalculationType.DETAILED_BREAKDOWN) {
      return this.createCombinedScenario(config.timeCalculationMode, config.timeCalculationMode, false);
    }

    const preliminaryStartPriceMode = config.acceptedOvertime ? ETimeCalculationMode.PEAK : ETimeCalculationMode.NORMAL;

    return this.createCombinedScenario(preliminaryStartPriceMode, preliminaryStartPriceMode, false);
  }

  private determineDualTimezoneMode(
    config: CalculationConfig,
    interpreterBoundary: BoundaryTimeDetails,
  ): CombinedScenario {
    const interpreterAutoMode = interpreterBoundary.scenario;
    const isInterpreterInNormalHours = interpreterAutoMode === ETimeCalculationMode.NORMAL;
    const isInterpreterInPeakHours =
      interpreterAutoMode === ETimeCalculationMode.PEAK || interpreterAutoMode === ETimeCalculationMode.CROSS_BOUNDARY;

    return this.applyDualTimezoneRules(
      config,
      interpreterAutoMode,
      isInterpreterInNormalHours,
      isInterpreterInPeakHours,
    );
  }

  private applyDualTimezoneRules(
    config: CalculationConfig,
    interpreterAutoMode: ETimeCalculationMode,
    isInterpreterInNormalHours: boolean,
    isInterpreterInPeakHours: boolean,
  ): CombinedScenario {
    if (config.isExternalInterpreter) {
      if (config.acceptedOvertime) {
        return this.createCombinedScenario(ETimeCalculationMode.PEAK, ETimeCalculationMode.PEAK, false);
      }

      return this.createCombinedScenario(interpreterAutoMode, interpreterAutoMode, false);
    }

    if (config.acceptedOvertime && isInterpreterInNormalHours) {
      return this.createCombinedScenario(ETimeCalculationMode.NORMAL, ETimeCalculationMode.NORMAL, false);
    }

    if (config.acceptedOvertime && isInterpreterInPeakHours) {
      return this.createCombinedScenario(interpreterAutoMode, interpreterAutoMode, false);
    }

    if (!config.acceptedOvertime && isInterpreterInNormalHours) {
      return this.createCombinedScenario(ETimeCalculationMode.NORMAL, ETimeCalculationMode.NORMAL, false);
    }

    if (!config.acceptedOvertime && interpreterAutoMode === ETimeCalculationMode.PEAK) {
      return this.createCombinedScenario(ETimeCalculationMode.NORMAL, interpreterAutoMode, true);
    }

    if (!config.acceptedOvertime && interpreterAutoMode === ETimeCalculationMode.CROSS_BOUNDARY) {
      return this.createCombinedScenario(interpreterAutoMode, interpreterAutoMode, false);
    }

    this.lokiLogger.error(
      `Unhandled dual timezone scenario: acceptedOvertime=${config.acceptedOvertime}, interpreterMode=${interpreterAutoMode}.`,
    );
    throw new InternalServerErrorException(ERatesErrorCodes.UNHANDLED_DUAL_TIMEZONE_SCENARIO);
  }

  private createCombinedScenario(
    clientMode: ETimeCalculationMode,
    interpreterMode: ETimeCalculationMode,
    requiresCrossRateLogic: boolean,
  ): CombinedScenario {
    return {
      clientMode,
      interpreterMode,
      requiresCrossRateLogic,
    };
  }

  private extractAndValidateNormalHours(rates: TRateCollection): {
    normalHoursStart: TimeString;
    normalHoursEnd: TimeString;
  } {
    return {
      normalHoursStart: rates.standardHoursFirstMinutes.normalHoursStart,
      normalHoursEnd: rates.standardHoursFirstMinutes.normalHoursEnd,
    };
  }

  private determineTimeBoundary(
    scheduleDateTime: string,
    duration: number,
    normalHoursStart: TimeString,
    normalHoursEnd: TimeString,
    timezone?: string,
  ): BoundaryTimeDetails {
    let scheduledStart = parseISO(scheduleDateTime);

    if (timezone) {
      scheduledStart = toZonedTime(scheduledStart, timezone);
    }

    const scheduledEnd = addMinutes(scheduledStart, duration);
    const normalHoursStartTime = applyRateTimeToDate(normalHoursStart, scheduledStart);
    const normalHoursEndTime = applyRateTimeToDate(normalHoursEnd, scheduledStart);

    const timeAnalysis = this.analyzeTimeOverlap(
      scheduledStart,
      scheduledEnd,
      normalHoursStartTime,
      normalHoursEndTime,
    );

    return {
      scenario: timeAnalysis.scenario,
      normalHoursStart: normalHoursStartTime,
      normalHoursEnd: normalHoursEndTime,
      scheduledStart,
      scheduledEnd,
      isStartBeforeNormal: timeAnalysis.isStartBeforeNormal,
      isEndAfterNormal: timeAnalysis.isEndAfterNormal,
    };
  }

  private analyzeTimeOverlap(
    scheduledStart: Date,
    scheduledEnd: Date,
    normalStart: Date,
    normalEnd: Date,
  ): TimeAnalysis {
    const scenario = determineTimeCalculationMode(scheduledStart, scheduledEnd, normalStart, normalEnd);

    return {
      scenario: scenario,
      isStartBeforeNormal: scheduledStart < normalStart,
      isEndAfterNormal: scheduledEnd > normalEnd,
    };
  }
}
