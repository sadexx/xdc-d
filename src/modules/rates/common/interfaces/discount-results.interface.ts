import { TBlockType, TDiscountAppliedMessage } from "src/modules/rates/common/types";
import { ETimeCalculationMode } from "src/modules/rates/common/enums";
import { AuditCollector } from "src/modules/rates/common/utils";

export interface DiscountResult {
  readonly finalAmount: number;
  readonly discountByMembershipMinutes: number;
  readonly discountByMembershipMinutesWithGst: number;
  readonly membershipFreeMinutesUsed: number;
  readonly discountByMembershipDiscount: number;
  readonly discountByMembershipDiscountWithGst: number;
  readonly membershipDiscountMinutesUsed: number;
  readonly discountByPromoCode: number;
  readonly discountByPromoCodeWithGst: number;
  readonly promoCampaignMinutesUsed: number;
  readonly updatedPriceBlocks: DiscountProcessingBlock[];
  readonly auditCollector?: AuditCollector;
}

export interface DiscountStepResult {
  readonly updatedAmount: number;
  readonly priceBlocks: DiscountProcessingBlock[];
  readonly discountAmount: number;
  readonly discountAmountWithGst: number;
  readonly minutesUsed: number;
}

export interface FreeMinutesResult extends DiscountStepResult {
  readonly remainingMinutes: number;
}

export interface DiscountProcessingBlock {
  readonly blockType: TBlockType;
  readonly duration: number;
  clientPrice: number;
  readonly originalClientPrice: number;
  readonly interpreterPayment: number;
  readonly clientTimeType: ETimeCalculationMode;
  readonly interpreterTimeType: ETimeCalculationMode;
  readonly requiresCrossRateLogic: boolean;
  readonly minutesInNormal?: number;
  readonly minutesInPeak?: number;
  discountsApplied: TDiscountAppliedMessage[];
}

export interface DiscountSummary {
  readonly finalDiscountAmount: number;
  readonly finalDiscountAmountWithGst: number;
  readonly membershipFreeMinutes: number;
  readonly membershipFreeMinutesWithGst: number;
  readonly membershipFreeMinutesUsed: number;
  readonly promoCampaignDiscount: number;
  readonly promoCampaignDiscountWithGst: number;
  readonly promoCampaignMinutesUsed: number;
  readonly membershipDiscount: number;
  readonly membershipDiscountWithGst: number;
  readonly membershipDiscountMinutesUsed: number;
}
