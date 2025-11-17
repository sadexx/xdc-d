import { Injectable } from "@nestjs/common";
import { PaymentItem } from "src/modules/payments/entities";
import { EntityManager } from "typeorm";
import { EPaymentStatus } from "src/modules/payments/common/enums/core";
import { findManyTyped, formatDecimalString, parseDecimalNumber, round2 } from "src/common/utils";
import {
  TCalculateFinalPaymentPriceCompany,
  TCalculateFinalPaymentPricePaymentItem,
  TUpdatePaymentTotals,
  UpdatePaymentTotalsQuery,
} from "src/modules/payments/common/types/pricing";
import { Company } from "src/modules/companies/entities";
import { PaymentsManagementService, PaymentsPriceCalculationService } from "src/modules/payments/services";
import {
  ICalculateFinalPaymentPriceData,
  IPaymentCalculationResult,
} from "src/modules/payments/common/interfaces/pricing";

@Injectable()
export class PaymentsPriceRecalculationService {
  constructor(
    private readonly paymentsManagementService: PaymentsManagementService,
    private readonly paymentsPriceCalculationService: PaymentsPriceCalculationService,
  ) {}

  /**
   * Recalculates the final payment price at the end of an appointment and updates the payment records accordingly.
   *
   * @param manager - The EntityManager instance for transactional operations (required for database consistency).
   * @param data - The input data containing appointment details, corporate flags, countries, and the existing payment.
   * @returns A promise resolving to the recalculated payment result, including client amounts, GST, and discounts.
   * @throws Will throw database or calculation errors if updates fail (e.g., invalid entity states).
   */
  public async calculateFinalPaymentPrice(
    manager: EntityManager,
    data: ICalculateFinalPaymentPriceData,
  ): Promise<IPaymentCalculationResult> {
    const { appointment, isClientCorporate, isInterpreterCorporate, clientCountry, interpreterCountry, payment } = data;

    const recalculatedPrice = await this.paymentsPriceCalculationService.calculatePaymentEndPrice({
      appointment,
      isClientCorporate,
      isInterpreterCorporate,
      clientCountry,
      interpreterCountry,
    });

    const [mainPaymentItem] = payment.items;
    const priceChanged = this.hasPriceChanged(mainPaymentItem, recalculatedPrice);
    await this.updatePaymentItem(manager, mainPaymentItem, recalculatedPrice, priceChanged);

    if (priceChanged) {
      await this.updatePaymentTotals(manager, payment.id);

      if (isClientCorporate && payment.company) {
        await this.updateCompanyDeposit(
          manager,
          payment.company,
          mainPaymentItem.fullAmount,
          recalculatedPrice.clientFullAmount,
        );
      }
    }

    return recalculatedPrice;
  }

  private hasPriceChanged(
    paymentItem: TCalculateFinalPaymentPricePaymentItem,
    calculatedPrice: IPaymentCalculationResult,
  ): boolean {
    return (
      round2(paymentItem.amount) !== round2(calculatedPrice.clientAmount) ||
      round2(paymentItem.gstAmount) !== round2(calculatedPrice.clientGstAmount)
    );
  }

  private async updatePaymentItem(
    manager: EntityManager,
    paymentItem: TCalculateFinalPaymentPricePaymentItem,
    calculatedPrice: IPaymentCalculationResult,
    priceChanged: boolean,
  ): Promise<void> {
    const updatePayload = this.buildPaymentItemUpdatePayload(calculatedPrice, priceChanged);
    await this.paymentsManagementService.updatePaymentItem(manager, { id: paymentItem.id }, updatePayload);
  }

  private buildPaymentItemUpdatePayload(
    calculatedPrice: IPaymentCalculationResult,
    priceChanged: boolean,
  ): Partial<PaymentItem> {
    const { appliedDiscounts, discountRate } = calculatedPrice;
    const priceFields = priceChanged
      ? {
          amount: formatDecimalString(calculatedPrice.clientAmount),
          gstAmount: formatDecimalString(calculatedPrice.clientGstAmount),
          fullAmount: formatDecimalString(calculatedPrice.clientFullAmount),
        }
      : {};
    const discountFields =
      appliedDiscounts && discountRate
        ? {
            appliedPromoCode: discountRate.promoCode,
            appliedMembershipType: discountRate.membershipType,
            appliedPromoDiscountsPercent: discountRate.promoCampaignDiscount,
            appliedMembershipDiscountsPercent: discountRate.membershipDiscount,
            appliedPromoDiscountsMinutes: appliedDiscounts.promoCampaignMinutesUsed,
            appliedMembershipFreeMinutes: appliedDiscounts.membershipFreeMinutesUsed,
            amountOfAppliedDiscountByMembershipMinutes: appliedDiscounts.membershipFreeMinutes
              ? formatDecimalString(appliedDiscounts.membershipFreeMinutes)
              : null,
            amountOfAppliedDiscountByMembershipDiscount: appliedDiscounts.membershipDiscount
              ? formatDecimalString(appliedDiscounts.membershipDiscount)
              : null,
            amountOfAppliedDiscountByPromoCode: appliedDiscounts.promoCampaignDiscount
              ? formatDecimalString(appliedDiscounts.promoCampaignDiscount)
              : null,
          }
        : {};

    return { ...priceFields, ...discountFields };
  }

  private async updatePaymentTotals(manager: EntityManager, paymentId: string): Promise<void> {
    const authorizedItems = await findManyTyped<TUpdatePaymentTotals[]>(manager.getRepository(PaymentItem), {
      select: UpdatePaymentTotalsQuery.select,
      where: { payment: { id: paymentId }, status: EPaymentStatus.AUTHORIZED },
    });

    const recalculatedTotals = this.calculateTotalsFromItems(authorizedItems);
    await this.paymentsManagementService.updatePayment(
      manager,
      { id: paymentId },
      {
        totalAmount: recalculatedTotals.amount,
        totalGstAmount: recalculatedTotals.gstAmount,
        totalFullAmount: recalculatedTotals.fullAmount,
      },
    );
  }

  private calculateTotalsFromItems(items: TUpdatePaymentTotals[]): {
    amount: string;
    gstAmount: string;
    fullAmount: string;
  } {
    let totalAmount = 0;
    let totalGstAmount = 0;
    let totalFullAmount = 0;

    for (const item of items) {
      totalAmount += parseDecimalNumber(item.amount);
      totalGstAmount += parseDecimalNumber(item.gstAmount);
      totalFullAmount += parseDecimalNumber(item.fullAmount);
    }

    return {
      amount: formatDecimalString(totalAmount),
      gstAmount: formatDecimalString(totalGstAmount),
      fullAmount: formatDecimalString(totalFullAmount),
    };
  }

  private async updateCompanyDeposit(
    manager: EntityManager,
    company: TCalculateFinalPaymentPriceCompany,
    oldFullAmount: number,
    newFullAmount: number,
  ): Promise<void> {
    if (!company.depositAmount) {
      return;
    }

    const difference = oldFullAmount - newFullAmount;
    const newDepositAmount = company.depositAmount + difference;

    await manager
      .getRepository(Company)
      .update({ id: company.id }, { depositAmount: formatDecimalString(newDepositAmount) });
  }
}
