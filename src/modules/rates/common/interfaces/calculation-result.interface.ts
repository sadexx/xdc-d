import {
  DiscountStepResult,
  CalculationConfig,
  DiscountProcessingBlock,
  DiscountSummary,
  FreeMinutesResult,
  PriceBlock,
  PriceBlockResult,
  TimeBoundaryResult,
} from "src/modules/rates/common/interfaces";
import { ETimeCalculationMode } from "src/modules/rates/common/enums";
import { TRateCollection, TSelectedPrices, TStepName } from "src/modules/rates/common/types";
import { AuditCollector } from "src/modules/rates/common/utils";

export interface CalculationSingleDayResult {
  readonly baseResult: BaseCalculationResult;
  readonly auditCollector?: AuditCollector;
}

export interface BaseCalculationResult {
  readonly scenario: ETimeCalculationMode;
  readonly totalClientPrice: number;
  readonly totalInterpreterPayment: number;
  readonly priceBlocks: PriceBlock[];
  readonly requiresCrossRateLogic: boolean;
  readonly addedDurationToLastBlockWhenRounding?: number;
}

export interface BillingSummary {
  readonly clientAmount: number;
  readonly clientGstAmount: number;
  readonly clientFullAmount: number;
  readonly interpreterAmount: number;
  readonly interpreterGstAmount: number;
  readonly interpreterFullAmount: number;
  readonly priceBreakdown: PriceBlock[] | DiscountProcessingBlock[];
  readonly addedDurationToLastBlockWhenRounding?: number;
  readonly appliedDiscounts?: DiscountSummary;
  readonly auditTrail?: AuditStep[];
}

export interface AuditStep {
  readonly stepName: TStepName;
  readonly stepInfo:
    | CalculationConfig
    | TRateCollection
    | TimeBoundaryResult
    | PriceBlockResult
    | TSelectedPrices
    | BaseCalculationResult
    | FreeMinutesResult
    | DiscountStepResult;
  readonly timestamp: Date;
}
