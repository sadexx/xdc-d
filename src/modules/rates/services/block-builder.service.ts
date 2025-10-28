import { BadRequestException, Injectable } from "@nestjs/common";
import { addMinutes } from "date-fns";
import { NUMBER_OF_MILLISECONDS_IN_MINUTE } from "src/common/constants";
import {
  CalculationConfig,
  PriceBlock,
  PriceBlockResult,
  TimeBoundaryResult,
} from "src/modules/rates/common/interfaces";
import { TRateCollection, TScenarioPeakNormal } from "src/modules/rates/common/types";
import { ERatesErrorCodes, ETimeCalculationMode } from "src/modules/rates/common/enums";
import { determineTimeCalculationMode } from "src/modules/rates/common/utils";

@Injectable()
export class BlockBuilderService {
  public createBaseBlock(
    config: CalculationConfig,
    rates: TRateCollection,
    timeBoundary: TimeBoundaryResult,
  ): PriceBlockResult {
    if (config.isEscortOrSimultaneous) {
      return this.createEscortSimultaneousBlock(rates.standardHoursFirstMinutes.detailsTime);
    }

    if (timeBoundary.combinedScenario.interpreterMode === ETimeCalculationMode.CROSS_BOUNDARY) {
      return this.createCrossBoundaryBlocks(config, rates, timeBoundary);
    }

    const anyAfterHours =
      this.isAfterHoursMode(timeBoundary.combinedScenario.clientMode) ||
      this.isAfterHoursMode(timeBoundary.combinedScenario.interpreterMode);
    const durations = this.selectDurations(rates, anyAfterHours);

    if (timeBoundary.combinedScenario.requiresCrossRateLogic) {
      return this.createUniversalBaseBlocks(
        config.duration,
        durations.baseDuration,
        durations.additionalDuration,
        ETimeCalculationMode.NORMAL,
        ETimeCalculationMode.PEAK,
        timeBoundary.combinedScenario.requiresCrossRateLogic,
      );
    }

    return this.createUniversalBaseBlocks(
      config.duration,
      durations.baseDuration,
      durations.additionalDuration,
      timeBoundary.combinedScenario.interpreterMode,
    );
  }

  private isAfterHoursMode(mode: ETimeCalculationMode): boolean {
    return mode === ETimeCalculationMode.PEAK || mode === ETimeCalculationMode.CROSS_BOUNDARY;
  }

  private selectDurations(
    rates: TRateCollection,
    useAfterHours: boolean,
  ): { baseDuration: number; additionalDuration?: number } {
    return {
      baseDuration: useAfterHours
        ? rates.afterHoursFirstMinutes?.detailsTime || rates.standardHoursFirstMinutes.detailsTime
        : rates.standardHoursFirstMinutes.detailsTime,
      additionalDuration: useAfterHours
        ? rates.afterHoursAdditionalBlock?.detailsTime || rates.standardHoursAdditionalBlock?.detailsTime
        : rates.standardHoursAdditionalBlock?.detailsTime,
    };
  }

  public createEscortSimultaneousBlock(duration: number): PriceBlockResult {
    return {
      scenario: ETimeCalculationMode.NORMAL,
      priceBlocks: [
        {
          blockType: "first",
          duration: duration,
          clientPrice: 0,
          interpreterPayment: 0,
          clientTimeType: ETimeCalculationMode.NORMAL,
          interpreterTimeType: ETimeCalculationMode.NORMAL,
          requiresCrossRateLogic: false,
        },
      ],
      requiresCrossRateLogic: false,
    };
  }

  public createUniversalBaseBlocks(
    duration: number,
    baseDuration: number,
    additionalDuration: number | undefined,
    clientTimeType: TScenarioPeakNormal,
    interpreterTimeType?: TScenarioPeakNormal,
    requiresCrossRateLogic: boolean = false,
  ): PriceBlockResult {
    const effectiveInterpreterTimeType = interpreterTimeType || clientTimeType;

    const result: PriceBlockResult = {
      scenario: effectiveInterpreterTimeType,
      priceBlocks: [
        {
          blockType: "first",
          duration: baseDuration,
          clientPrice: 0,
          clientTimeType: clientTimeType,
          interpreterPayment: 0,
          interpreterTimeType: effectiveInterpreterTimeType,
          requiresCrossRateLogic: requiresCrossRateLogic,
        },
      ],
      requiresCrossRateLogic: requiresCrossRateLogic,
      addedDurationToLastBlockWhenRounding: baseDuration - duration,
    };

    if (duration <= baseDuration) {
      return result;
    }

    if (!additionalDuration) {
      throw new BadRequestException(ERatesErrorCodes.ADDITIONAL_PRICES_REQUIRED);
    }

    const extraMinutes = duration - baseDuration;
    const extraBlocks = Math.ceil(extraMinutes / additionalDuration);
    const extraBlocksDuration = extraBlocks * additionalDuration;

    for (let i = 0; i < extraBlocks; i++) {
      result.priceBlocks.push({
        blockType: "additional",
        duration: additionalDuration,
        clientPrice: 0,
        interpreterPayment: 0,
        clientTimeType: clientTimeType,
        interpreterTimeType: effectiveInterpreterTimeType,
        requiresCrossRateLogic: requiresCrossRateLogic,
      });
    }

    result.addedDurationToLastBlockWhenRounding = extraBlocksDuration - extraMinutes;

    return result;
  }

  private createCrossBoundaryBlocks(
    config: CalculationConfig,
    rates: TRateCollection,
    timeBoundary: TimeBoundaryResult,
  ): PriceBlockResult {
    const boundaryDetails =
      timeBoundary.combinedScenario.interpreterMode === ETimeCalculationMode.CROSS_BOUNDARY
        ? timeBoundary.interpreter
        : timeBoundary.client;

    const standardDurations = this.selectDurations(rates, false);
    const peakDurations = this.selectDurations(rates, true);

    if (!standardDurations.additionalDuration || !peakDurations.additionalDuration) {
      throw new BadRequestException(ERatesErrorCodes.CROSS_BOUNDARY_ADDITIONAL_PRICES_REQUIRED);
    }

    const priceBlocks: PriceBlock[] = [];
    let remainingDuration = config.duration;
    let currentTime = boundaryDetails.scheduledStart;
    let isFirstBlock = true;

    while (remainingDuration > 0 || isFirstBlock) {
      const initialDurationType = this.determineInitialDurationType(
        currentTime,
        boundaryDetails.normalHoursStart,
        boundaryDetails.normalHoursEnd,
      );

      const selectedDurations = initialDurationType === "peak" ? peakDurations : standardDurations;

      const blockDuration = isFirstBlock
        ? selectedDurations.baseDuration
        : (selectedDurations.additionalDuration as number);

      const blockEnd = addMinutes(currentTime, blockDuration);
      const timeType = determineTimeCalculationMode(
        currentTime,
        blockEnd,
        boundaryDetails.normalHoursStart,
        boundaryDetails.normalHoursEnd,
      );

      const block: PriceBlock = {
        blockType: isFirstBlock ? "first" : "additional",
        duration: blockDuration,
        clientPrice: 0,
        interpreterPayment: 0,
        clientTimeType: timeType,
        interpreterTimeType: timeType,
        requiresCrossRateLogic: timeBoundary.combinedScenario.requiresCrossRateLogic,
      };

      if (timeType === ETimeCalculationMode.CROSS_BOUNDARY) {
        const timeDistribution = this.calculateBlockTimeDistribution(
          currentTime,
          blockEnd,
          boundaryDetails.normalHoursStart,
          boundaryDetails.normalHoursEnd,
        );
        block.minutesInNormal = timeDistribution.minutesInNormal;
        block.minutesInPeak = timeDistribution.minutesInPeak;
      }

      priceBlocks.push(block);

      remainingDuration -= Math.min(remainingDuration, blockDuration);
      currentTime = blockEnd;
      isFirstBlock = false;

      if (remainingDuration <= 0) {
        break;
      }
    }

    const totalBlockDuration = priceBlocks.reduce((sum, block) => sum + block.duration, 0);

    return {
      scenario: ETimeCalculationMode.CROSS_BOUNDARY,
      priceBlocks,
      requiresCrossRateLogic: timeBoundary.combinedScenario.requiresCrossRateLogic,
      addedDurationToLastBlockWhenRounding: totalBlockDuration - config.duration,
    };
  }

  private determineInitialDurationType(startTime: Date, normalStart: Date, normalEnd: Date): TScenarioPeakNormal {
    if (startTime < normalStart || startTime > normalEnd) {
      return "peak";
    }

    return "normal";
  }

  private calculateBlockTimeDistribution(
    blockStart: Date,
    blockEnd: Date,
    normalStart: Date,
    normalEnd: Date,
  ): { minutesInNormal: number; minutesInPeak: number } {
    const effectiveNormalStart = blockStart < normalStart ? normalStart : blockStart;
    const effectiveNormalEnd = blockEnd > normalEnd ? normalEnd : blockEnd;

    let minutesInNormal = 0;

    if (effectiveNormalStart < effectiveNormalEnd) {
      minutesInNormal = Math.floor(
        (effectiveNormalEnd.getTime() - effectiveNormalStart.getTime()) / NUMBER_OF_MILLISECONDS_IN_MINUTE,
      );
    }

    const totalMinutes = Math.floor((blockEnd.getTime() - blockStart.getTime()) / NUMBER_OF_MILLISECONDS_IN_MINUTE);

    const minutesInPeak = totalMinutes - minutesInNormal;

    return { minutesInNormal, minutesInPeak };
  }
}
