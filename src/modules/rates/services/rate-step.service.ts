import { Injectable, BadRequestException } from "@nestjs/common";
import {
  CalculationConfigValidatorService,
  DiscountProcessorService,
  PriceCalculationService,
  BlockBuilderService,
  RateRetrieverService,
  TimeBoundaryAnalyzerService,
} from "src/modules/rates/services";
import {
  CalculationConfig,
  BillingSummary,
  DiscountResult,
  CalculationSingleDayResult,
} from "src/modules/rates/common/interfaces";
import { ECalculationType } from "src/modules/rates/common/enums";
import { EAppointmentInterpretingType } from "src/modules/appointments/appointment/common/enums";
import { round2 } from "src/common/utils";
import { GST_COEFFICIENT, UNDEFINED_VALUE } from "src/common/constants";
import { AuditCollector } from "src/modules/rates/common/utils";
import { LokiLogger } from "src/common/logger";

@Injectable()
export class RateStepService {
  private readonly lokiLogger = new LokiLogger(RateStepService.name);

  constructor(
    private readonly calculationConfigValidatorService: CalculationConfigValidatorService,
    private readonly timeBoundaryAnalyzerService: TimeBoundaryAnalyzerService,
    private readonly rateRetrieverService: RateRetrieverService,
    private readonly blockBuilderService: BlockBuilderService,
    private readonly priceCalculationService: PriceCalculationService,
    private readonly discountProcessorService: DiscountProcessorService,
  ) {}

  public async calculate(config: CalculationConfig): Promise<BillingSummary> {
    this.calculationConfigValidatorService.validate(config);

    switch (config.calculationType) {
      case ECalculationType.PRELIMINARY_ESTIMATE:
        return await this.calculatePreliminaryEstimate(config);
      case ECalculationType.SINGLE_BLOCK:
        return await this.calculateSingleBlock(config);
      case ECalculationType.DETAILED_BREAKDOWN:
        return await this.calculateDetailedBreakdown(config);
      case ECalculationType.APPOINTMENT_START_PRICE || ECalculationType.APPOINTMENT_END_PRICE:
        return await this.calculateAppointmentPrice(config);
      default:
        throw new BadRequestException("Invalid calculation type");
    }
  }

  private async calculatePreliminaryEstimate(config: CalculationConfig): Promise<BillingSummary> {
    let totalPrice = 0;

    const mainDayResult = await this.calculateSingleDay(config);
    totalPrice += mainDayResult.baseResult.totalClientPrice;

    if (config.extraDays && config.extraDays.length > 0) {
      for (const extraDay of config.extraDays) {
        config.duration = extraDay.duration;
        config.scheduleDateTime = extraDay.scheduleDateTime;
        const extraDayResult = await this.calculateSingleDay(config);
        totalPrice += extraDayResult.baseResult.totalClientPrice;
      }
    }

    return {
      clientAmount: round2(totalPrice),
      clientGstAmount: 0,
      clientFullAmount: round2(totalPrice),
      interpreterAmount: 0,
      interpreterGstAmount: 0,
      interpreterFullAmount: 0,
      priceBreakdown: [],
    };
  }

  private async calculateSingleBlock(config: CalculationConfig): Promise<BillingSummary> {
    return await this.calculateAppointmentPrice(config);
  }

  private async calculateDetailedBreakdown(config: CalculationConfig): Promise<BillingSummary> {
    const auditCollector = config.includeAuditSteps ? new AuditCollector() : UNDEFINED_VALUE;

    return await this.calculateAppointmentPrice(config, auditCollector);
  }

  private async calculateAppointmentPrice(
    config: CalculationConfig,
    auditCollector?: AuditCollector,
  ): Promise<BillingSummary> {
    const result = await this.calculateSingleDay(config, auditCollector);

    const discountResult = config.includeDiscounts
      ? this.discountProcessorService.applyDiscounts(result.baseResult, config, result.auditCollector)
      : UNDEFINED_VALUE;

    return this.prepareBaseCalculationResult(config, result, discountResult);
  }

  private async calculateSingleDay(
    config: CalculationConfig,
    auditCollector?: AuditCollector,
  ): Promise<CalculationSingleDayResult> {
    auditCollector?.addStep({
      stepName: "Step 0 - Calculation Config",
      stepInfo: config,
    });

    config.isEscortOrSimultaneous =
      config.interpretingType === EAppointmentInterpretingType.ESCORT ||
      config.interpretingType === EAppointmentInterpretingType.SIMULTANEOUS;

    const rates = await this.rateRetrieverService.fetchRatesForCalculation(config);

    auditCollector?.addStep({
      stepName: "Step 1 - Rates Retrieved",
      stepInfo: rates,
    });

    const timeBoundary = this.timeBoundaryAnalyzerService.analyzeTimeScenario(config, rates);

    auditCollector?.addStep({
      stepName: "Step 2 - Time Boundary Analysis",
      stepInfo: timeBoundary,
    });

    const baseBlockResult = this.blockBuilderService.createBaseBlock(config, rates, timeBoundary);

    auditCollector?.addStep({
      stepName: "Step 3 - Base Block Creation",
      stepInfo: baseBlockResult,
    });

    const prices = this.rateRetrieverService.selectPriceFields(rates, config);

    auditCollector?.addStep({
      stepName: "Step 4 - Price Field Selection",
      stepInfo: prices,
    });

    const baseResult = this.priceCalculationService.calculatePricingStrategy(config, baseBlockResult, prices);

    auditCollector?.addStep({
      stepName: "Step 5 - Base Price Calculation",
      stepInfo: baseResult,
    });

    return {
      baseResult: baseResult,
      auditCollector: auditCollector,
    };
  }

  private prepareBaseCalculationResult(
    config: CalculationConfig,
    result: CalculationSingleDayResult,
    discountResult?: DiscountResult,
  ): BillingSummary {
    const { baseResult } = result;

    const isDiscountEnabled = config.includeDiscounts && discountResult;
    let clientAmount = discountResult?.finalAmount ?? baseResult.totalClientPrice;
    let clientGstAmount = 0;
    let interpreterAmount = baseResult.totalInterpreterPayment;
    let interpreterGstAmount = 0;

    if (config.clientIsGstPayer && clientAmount > 0) {
      const preGstClientAmount = round2(clientAmount / GST_COEFFICIENT);
      clientGstAmount = round2(clientAmount - preGstClientAmount);
      clientAmount = preGstClientAmount;
    }

    if (config.interpreterIsGstPayer) {
      const preGstInterpreterAmount = round2(interpreterAmount / GST_COEFFICIENT);
      interpreterGstAmount = round2(interpreterAmount - preGstInterpreterAmount);
      interpreterAmount = preGstInterpreterAmount;
    }

    let totalDiscountPreGst = 0;
    let totalDiscountWithGst = 0;

    if (isDiscountEnabled) {
      totalDiscountPreGst = round2(
        discountResult.discountByMembershipMinutes +
          discountResult.discountByPromoCode +
          discountResult.discountByMembershipDiscount,
      );

      totalDiscountWithGst = round2(
        discountResult.discountByMembershipMinutesWithGst +
          discountResult.discountByPromoCodeWithGst +
          discountResult.discountByMembershipDiscountWithGst,
      );

      // TODO: Verification against actual calculation, delete when confirmed
      const originalTotal = baseResult.totalClientPrice;
      const finalTotal = discountResult.finalAmount;
      const calculatedDiscountWithGst = round2(originalTotal - finalTotal);

      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      if (Math.abs(totalDiscountWithGst - calculatedDiscountWithGst) > 0.01) {
        this.lokiLogger.warn(
          `Discount tracking mismatch: tracked=${totalDiscountWithGst}, calculated=${calculatedDiscountWithGst}`,
        );
      }
    }

    return {
      clientAmount: round2(clientAmount),
      clientGstAmount: clientGstAmount,
      clientFullAmount: round2(clientAmount + clientGstAmount),
      interpreterAmount: interpreterAmount,
      interpreterGstAmount: interpreterGstAmount,
      interpreterFullAmount: round2(interpreterAmount + interpreterGstAmount),
      priceBreakdown: discountResult?.updatedPriceBlocks ?? baseResult.priceBlocks,
      addedDurationToLastBlockWhenRounding: baseResult.addedDurationToLastBlockWhenRounding,
      appliedDiscounts: isDiscountEnabled
        ? {
            finalDiscountAmount: totalDiscountPreGst,
            finalDiscountAmountWithGst: totalDiscountWithGst,
            membershipFreeMinutes: round2(discountResult.discountByMembershipMinutes),
            membershipFreeMinutesWithGst: round2(discountResult.discountByMembershipMinutesWithGst),
            membershipFreeMinutesUsed: round2(discountResult.membershipFreeMinutesUsed),
            promoCampaignDiscount: round2(discountResult.discountByPromoCode),
            promoCampaignDiscountWithGst: round2(discountResult.discountByPromoCodeWithGst),
            promoCampaignMinutesUsed: round2(discountResult.promoCampaignMinutesUsed),
            membershipDiscount: round2(discountResult.discountByMembershipDiscount),
            membershipDiscountWithGst: round2(discountResult.discountByMembershipDiscountWithGst),
            membershipDiscountMinutesUsed: round2(discountResult.membershipDiscountMinutesUsed),
          }
        : UNDEFINED_VALUE,
      auditTrail: discountResult?.auditCollector?.getSteps() ?? result.auditCollector?.getSteps(),
    };
  }
}
