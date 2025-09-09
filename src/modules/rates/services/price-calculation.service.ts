import { Injectable } from "@nestjs/common";
import { ONE_HUNDRED } from "src/common/constants";
import {
  BaseCalculationResult,
  CalculationConfig,
  PartyFlatPrices,
  PartyStandardPrices,
  PriceBlock,
  PriceBlockResult,
} from "src/modules/rates/common/interfaces";
import { TBlockType, TScenarioPeakNormal, TSelectedPrices, TTargetRolePricing } from "src/modules/rates/common/types";
import { ETimeCalculationMode } from "src/modules/rates/common/enums";

@Injectable()
export class PriceCalculationService {
  public calculatePricingStrategy(
    config: CalculationConfig,
    baseBlockResult: PriceBlockResult,
    prices: TSelectedPrices,
  ): BaseCalculationResult {
    for (const block of baseBlockResult.priceBlocks) {
      block.clientPrice = this.roundToTwoDecimals(
        this.calculateBlockPrice(block, "client", prices, config.isEscortOrSimultaneous),
      );
      block.interpreterPayment = this.roundToTwoDecimals(
        this.calculateBlockPrice(block, "interpreter", prices, config.isEscortOrSimultaneous),
      );
    }

    const { totalClientPrice, totalInterpreterPayment } = baseBlockResult.priceBlocks.reduce(
      (priceAccumulator, block) => ({
        totalClientPrice: priceAccumulator.totalClientPrice + block.clientPrice,
        totalInterpreterPayment: priceAccumulator.totalInterpreterPayment + block.interpreterPayment,
      }),
      { totalClientPrice: 0, totalInterpreterPayment: 0 },
    );

    return {
      scenario: baseBlockResult.scenario,
      totalClientPrice: this.truncateToTwoDecimals(totalClientPrice),
      totalInterpreterPayment: this.truncateToTwoDecimals(totalInterpreterPayment),
      priceBlocks: baseBlockResult.priceBlocks,
      requiresCrossRateLogic: baseBlockResult.requiresCrossRateLogic,
      addedDurationToLastBlockWhenRounding: baseBlockResult.addedDurationToLastBlockWhenRounding,
    };
  }

  private calculateBlockPrice(
    block: PriceBlock,
    party: TTargetRolePricing,
    prices: TSelectedPrices,
    isEscortOrSimultaneous?: boolean,
  ): number {
    if (isEscortOrSimultaneous) {
      const flatRatePrices = prices[party] as PartyFlatPrices;
      const pricePerMinute = flatRatePrices.basePriceStandardPerMinute;

      return pricePerMinute * block.duration;
    }

    const timeType = party === "client" ? block.clientTimeType : block.interpreterTimeType;
    const partyPrices = prices[party];

    if (timeType === ETimeCalculationMode.CROSS_BOUNDARY) {
      return this.calculateCrossBoundaryPrice(block, partyPrices as PartyStandardPrices);
    }

    const pricePerMinute = this.selectPricePerMinute(block.blockType, timeType, partyPrices as PartyStandardPrices);

    return pricePerMinute * block.duration;
  }

  private calculateCrossBoundaryPrice(block: PriceBlock, partyPrices: PartyStandardPrices): number {
    const { minutesInNormal = 0, minutesInPeak = 0 } = block;

    const normalPricePerMinute = this.selectPricePerMinute(block.blockType, "normal", partyPrices);
    const peakPricePerMinute = this.selectPricePerMinute(block.blockType, "peak", partyPrices);

    return minutesInNormal * normalPricePerMinute + minutesInPeak * peakPricePerMinute;
  }

  private selectPricePerMinute(
    blockType: TBlockType,
    timeType: TScenarioPeakNormal,
    partyPrices: PartyStandardPrices,
  ): number {
    if (blockType === "first") {
      return timeType === "normal" ? partyPrices.basePriceStandardPerMinute : partyPrices.basePriceAfterHoursPerMinute;
    } else {
      return timeType === "normal"
        ? partyPrices.additionalPriceStandardPerMinute
        : partyPrices.additionalPriceAfterHoursPerMinute;
    }
  }

  private roundToTwoDecimals(value: number): number {
    return Math.round(value * ONE_HUNDRED) / ONE_HUNDRED;
  }

  private truncateToTwoDecimals(value: number): number {
    return Math.floor(value * ONE_HUNDRED) / ONE_HUNDRED;
  }
}
