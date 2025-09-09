import { Injectable } from "@nestjs/common";
import { GST_COEFFICIENT, ONE_HUNDRED } from "src/common/constants";
import { IDiscountRate } from "src/modules/discounts/common/interfaces";
import {
  BaseCalculationResult,
  DiscountStepResult,
  CalculationConfig,
  DiscountResult,
  DiscountProcessingBlock,
  FreeMinutesResult,
} from "src/modules/rates/common/interfaces";
import { TDiscountAppliedMessage, TDiscountName } from "src/modules/rates/common/types";
import { AuditCollector } from "src/modules/rates/common/utils";

@Injectable()
export class DiscountProcessorService {
  public applyDiscounts(
    baseResult: BaseCalculationResult,
    config: CalculationConfig,
    auditCollector?: AuditCollector,
  ): DiscountResult {
    if (!config.discounts) {
      return this.createNoDiscountResult(baseResult);
    }

    let currentAmount = baseResult.totalClientPrice;
    const priceBlocks: DiscountProcessingBlock[] = baseResult.priceBlocks.map((block) => ({
      ...block,
      originalClientPrice: block.clientPrice,
      discountsApplied: [],
    }));

    const freeMinutesResult = this.applyFreeMinutes(currentAmount, priceBlocks, config);
    currentAmount = freeMinutesResult.updatedAmount;

    auditCollector?.addStep({
      stepName: "Step 6 - Apply Membership Free Minutes",
      stepInfo: freeMinutesResult,
    });

    const promoResult = this.applyPromoDiscounts(
      currentAmount,
      priceBlocks,
      config,
      freeMinutesResult.remainingMinutes,
    );
    currentAmount = promoResult.updatedAmount;

    auditCollector?.addStep({
      stepName: "Step 7 - Apply Promo Campaign Discounts",
      stepInfo: promoResult,
    });

    const membershipResult = this.applyMembershipDiscount(currentAmount, priceBlocks, config);
    currentAmount = membershipResult.updatedAmount;

    auditCollector?.addStep({
      stepName: "Step 8 - Apply Membership Discount",
      stepInfo: membershipResult,
    });

    return {
      finalAmount: currentAmount,
      discountByMembershipMinutes: freeMinutesResult.discountAmount,
      discountByMembershipMinutesWithGst: freeMinutesResult.discountAmountWithGst,
      membershipFreeMinutesUsed: freeMinutesResult.minutesUsed,
      discountByPromoCode: promoResult.discountAmount,
      discountByPromoCodeWithGst: promoResult.discountAmountWithGst,
      promoCampaignMinutesUsed: promoResult.minutesUsed,
      discountByMembershipDiscount: membershipResult.discountAmount,
      discountByMembershipDiscountWithGst: membershipResult.discountAmountWithGst,
      membershipDiscountMinutesUsed: membershipResult.minutesUsed,
      updatedPriceBlocks: priceBlocks,
      auditCollector: auditCollector,
    };
  }

  private createNoDiscountResult(baseResult: BaseCalculationResult): DiscountResult {
    const priceBlocks: DiscountProcessingBlock[] = baseResult.priceBlocks.map((block) => ({
      ...block,
      originalClientPrice: block.clientPrice,
      discountsApplied: [],
    }));

    return {
      finalAmount: baseResult.totalClientPrice,
      discountByMembershipMinutes: 0,
      discountByMembershipMinutesWithGst: 0,
      membershipFreeMinutesUsed: 0,
      discountByMembershipDiscount: 0,
      discountByMembershipDiscountWithGst: 0,
      membershipDiscountMinutesUsed: 0,
      discountByPromoCode: 0,
      discountByPromoCodeWithGst: 0,
      promoCampaignMinutesUsed: 0,
      updatedPriceBlocks: priceBlocks,
    };
  }

  private applyFreeMinutes(
    currentAmount: number,
    priceBlocks: DiscountProcessingBlock[],
    config: CalculationConfig,
  ): FreeMinutesResult {
    const freeMinutes = (config.discounts as IDiscountRate).membershipFreeMinutes ?? 0;

    if (freeMinutes <= 0) {
      return this.getEmptyFreeMinutesResult(currentAmount, priceBlocks, config);
    }

    const minutesUsed = Math.min(freeMinutes, config.duration);

    if (freeMinutes >= config.duration) {
      return this.getFullFreeMinutesResult(currentAmount, priceBlocks, config, minutesUsed);
    }

    let remainingFreeMinutes = freeMinutes;
    let totalDiscountAmount = 0;
    let totalDiscountAmountWithGst = 0;

    for (const block of priceBlocks) {
      if (remainingFreeMinutes <= 0 || currentAmount <= 0) {
        break;
      }

      const originalBlockPrice = block.clientPrice;
      const blockPriceBeforeGst = config.clientIsGstPayer ? originalBlockPrice / GST_COEFFICIENT : originalBlockPrice;

      const minutesToUse = Math.min(remainingFreeMinutes, block.duration);
      const coverageRatio = minutesToUse / block.duration;

      const preGstDiscount = blockPriceBeforeGst * coverageRatio;
      const gstInclusiveDiscount = minutesToUse === block.duration ? originalBlockPrice : preGstDiscount;

      totalDiscountAmount += preGstDiscount;
      totalDiscountAmountWithGst += gstInclusiveDiscount;
      currentAmount -= gstInclusiveDiscount;
      block.clientPrice = originalBlockPrice - gstInclusiveDiscount;

      const discountLabel: TDiscountAppliedMessage =
        minutesToUse === block.duration
          ? "Membership Free Minutes (100%)"
          : `Membership Free Minutes (${minutesToUse}min)`;
      block.discountsApplied.push(discountLabel);

      remainingFreeMinutes -= minutesToUse;
    }

    return {
      updatedAmount: Math.max(0, currentAmount),
      priceBlocks: priceBlocks,
      discountAmount: totalDiscountAmount,
      discountAmountWithGst: totalDiscountAmountWithGst,
      remainingMinutes: config.duration - freeMinutes,
      minutesUsed,
    };
  }

  private applyPromoDiscounts(
    currentAmount: number,
    priceBlocks: DiscountProcessingBlock[],
    config: CalculationConfig,
    remainingMinutes: number,
  ): DiscountStepResult {
    const discounts = config.discounts as IDiscountRate;

    if (currentAmount <= 0 || !discounts.promoCampaignDiscount) {
      return this.getEmptyDiscountResult(currentAmount, priceBlocks);
    }

    if (discounts.membershipDiscount && discounts.promoCampaignDiscount <= discounts.membershipDiscount) {
      return this.getEmptyDiscountResult(currentAmount, priceBlocks);
    }

    if (discounts.promoCampaignDiscountMinutes) {
      const discountMinutes = discounts.promoCampaignDiscountMinutes;

      return this.applyMinuteBasedDiscount(
        currentAmount,
        priceBlocks,
        discountMinutes,
        discounts.promoCampaignDiscount,
        remainingMinutes,
        config,
        "Promo Campaign Minutes Discount",
      );
    } else {
      const result = this.applyPercentageDiscount(
        currentAmount,
        priceBlocks,
        discounts.promoCampaignDiscount,
        config,
        "Promo Campaign Percentage Discount",
      );

      const minutesUsed = remainingMinutes;

      return {
        ...result,
        minutesUsed,
      };
    }
  }

  private applyMinuteBasedDiscount(
    currentAmount: number,
    priceBlocks: DiscountProcessingBlock[],
    discountMinutes: number,
    discountPercent: number,
    remainingMinutes: number,
    config: CalculationConfig,
    discountName: TDiscountName,
  ): DiscountStepResult {
    if (discountMinutes <= 0 || remainingMinutes <= 0) {
      return this.getEmptyDiscountResult(currentAmount, priceBlocks);
    }

    let remainingDiscountMinutes = Math.min(discountMinutes, remainingMinutes);
    const originalDiscountMinutes = remainingDiscountMinutes;
    let totalDiscountAmount = 0;
    let totalDiscountAmountWithGst = 0;

    for (const block of priceBlocks) {
      if (remainingDiscountMinutes <= 0 || block.clientPrice <= 0) {
        continue;
      }

      const originalBlockPrice = block.clientPrice;

      const pricingRatio = block.clientPrice / block.originalClientPrice;
      const availableMinutesInBlock = Math.round(block.duration * pricingRatio);

      const minutesToDiscount = Math.min(remainingDiscountMinutes, availableMinutesInBlock);
      const coverageRatio = minutesToDiscount / availableMinutesInBlock;

      const blockPriceBeforeGst = config.clientIsGstPayer ? originalBlockPrice / GST_COEFFICIENT : originalBlockPrice;

      const discountablePortion = blockPriceBeforeGst * coverageRatio;
      const preGstDiscount = discountablePortion * (discountPercent / ONE_HUNDRED);

      const isFullCoverage = minutesToDiscount >= availableMinutesInBlock;
      const isFullDiscount = discountPercent === ONE_HUNDRED;

      let gstInclusiveDiscount;

      if (isFullCoverage && isFullDiscount) {
        gstInclusiveDiscount = originalBlockPrice;
        block.clientPrice = 0;
      } else if (isFullDiscount) {
        gstInclusiveDiscount = originalBlockPrice * coverageRatio;
        block.clientPrice = originalBlockPrice - gstInclusiveDiscount;
      } else {
        gstInclusiveDiscount = preGstDiscount;
        block.clientPrice = originalBlockPrice - gstInclusiveDiscount;
      }

      totalDiscountAmount += preGstDiscount;
      totalDiscountAmountWithGst += gstInclusiveDiscount;
      currentAmount -= gstInclusiveDiscount;

      block.discountsApplied.push(`${discountName} (${minutesToDiscount}min at ${discountPercent}%)`);

      remainingDiscountMinutes -= minutesToDiscount;
    }

    const minutesUsed = originalDiscountMinutes - remainingDiscountMinutes;

    return {
      updatedAmount: Math.max(0, currentAmount),
      priceBlocks,
      discountAmount: totalDiscountAmount,
      discountAmountWithGst: totalDiscountAmountWithGst,
      minutesUsed,
    };
  }

  private applyPercentageDiscount(
    currentAmount: number,
    priceBlocks: DiscountProcessingBlock[],
    discountPercent: number,
    config: CalculationConfig,
    discountName: TDiscountName,
  ): {
    updatedAmount: number;
    priceBlocks: DiscountProcessingBlock[];
    discountAmount: number;
    discountAmountWithGst: number;
  } {
    if (discountPercent <= 0 || currentAmount <= 0) {
      return this.getEmptyDiscountResult(currentAmount, priceBlocks);
    }

    const preGstCurrentAmount = config.clientIsGstPayer ? currentAmount / GST_COEFFICIENT : currentAmount;
    const auditDiscountAmount = preGstCurrentAmount * (discountPercent / ONE_HUNDRED);

    const actualDiscountAmount = currentAmount * (discountPercent / ONE_HUNDRED);
    const newAmount = currentAmount - actualDiscountAmount;

    for (const block of priceBlocks) {
      if (block.clientPrice <= 0) {
        continue;
      }

      const blockDiscountAmount = block.clientPrice * (discountPercent / ONE_HUNDRED);
      block.clientPrice = block.clientPrice - blockDiscountAmount;
      block.discountsApplied.push(`${discountName} (${discountPercent}%)`);
    }

    return {
      updatedAmount: Math.max(0, newAmount),
      priceBlocks: priceBlocks,
      discountAmount: auditDiscountAmount,
      discountAmountWithGst: actualDiscountAmount,
    };
  }

  private applyMembershipDiscount(
    currentAmount: number,
    priceBlocks: DiscountProcessingBlock[],
    config: CalculationConfig,
  ): DiscountStepResult {
    const discounts = config.discounts as IDiscountRate;
    const membershipDiscount = discounts?.membershipDiscount || 0;

    if (currentAmount <= 0 || membershipDiscount <= 0) {
      return this.getEmptyDiscountResult(currentAmount, priceBlocks);
    }

    const result = this.applyPercentageDiscount(
      currentAmount,
      priceBlocks,
      membershipDiscount,
      config,
      "Membership Discount",
    );

    const minutesUsed = this.calculateMinutesUsedFromBlocks(priceBlocks);

    return {
      ...result,
      minutesUsed: minutesUsed,
    };
  }

  private getEmptyFreeMinutesResult(
    currentAmount: number,
    priceBlocks: DiscountProcessingBlock[],
    config: CalculationConfig,
  ): FreeMinutesResult {
    return {
      updatedAmount: currentAmount,
      priceBlocks: priceBlocks,
      discountAmount: 0,
      discountAmountWithGst: 0,
      remainingMinutes: config.duration,
      minutesUsed: 0,
    };
  }

  private getFullFreeMinutesResult(
    currentAmount: number,
    priceBlocks: DiscountProcessingBlock[],
    config: CalculationConfig,
    minutesUsed: number,
  ): FreeMinutesResult {
    const totalDiscountAmount = config.clientIsGstPayer ? currentAmount / GST_COEFFICIENT : currentAmount;

    for (const block of priceBlocks) {
      block.clientPrice = 0;
      block.discountsApplied.push("Membership Free Minutes (100%)");
    }

    return {
      updatedAmount: 0,
      priceBlocks: priceBlocks,
      discountAmount: totalDiscountAmount,
      discountAmountWithGst: currentAmount,
      remainingMinutes: 0,
      minutesUsed,
    };
  }

  private getEmptyDiscountResult(currentAmount: number, priceBlocks: DiscountProcessingBlock[]): DiscountStepResult {
    return {
      updatedAmount: currentAmount,
      priceBlocks: priceBlocks,
      discountAmount: 0,
      discountAmountWithGst: 0,
      minutesUsed: 0,
    };
  }

  private calculateMinutesUsedFromBlocks(priceBlocks: DiscountProcessingBlock[]): number {
    let minutesUsed = 0;
    for (const block of priceBlocks) {
      if (block.clientPrice > 0) {
        const pricingRatio = block.clientPrice / block.originalClientPrice;
        minutesUsed += Math.round(block.duration * pricingRatio);
      }
    }

    return minutesUsed;
  }
}
