import { TBlockType } from "src/modules/rates/common/types";
import { ETimeCalculationMode } from "src/modules/rates/common/enums";

export interface PriceBlockResult {
  readonly scenario: ETimeCalculationMode;
  readonly priceBlocks: PriceBlock[];
  readonly requiresCrossRateLogic: boolean;
  addedDurationToLastBlockWhenRounding?: number;
}

export interface PriceBlock {
  readonly blockType: TBlockType;
  readonly duration: number;
  clientPrice: number;
  interpreterPayment: number;
  readonly clientTimeType: ETimeCalculationMode;
  readonly interpreterTimeType: ETimeCalculationMode;
  readonly requiresCrossRateLogic: boolean;
  minutesInNormal?: number;
  minutesInPeak?: number;
}
