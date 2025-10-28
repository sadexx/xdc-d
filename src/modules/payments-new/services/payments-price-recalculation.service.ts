import { Injectable } from "@nestjs/common";
import { Payment, PaymentItem } from "src/modules/payments-new/entities";
import { IPaymentCalculationResult } from "src/modules/payments-new/common/interfaces";
import { PaymentsPriceCalculationService } from "src/modules/payments-new/services";
import { EntityManager } from "typeorm";
import { EPaymentStatus } from "src/modules/payments-new/common/enums";
import { round2 } from "src/common/utils";
import {
  TCalculateFinalPaymentPriceCompany,
  TCalculateFinalPaymentPricePayment,
  TCalculateFinalPaymentPricePaymentItem,
  TCalculatePaymentPriceAppointment,
} from "src/modules/payments-new/common/types";
import { Company } from "src/modules/companies/entities";
import { ICorporateCaptureContext } from "src/modules/payment-analysis/common/interfaces/capture";

@Injectable()
export class PaymentsPriceRecalculationService {
  constructor(private readonly paymentsPriceCalculationService: PaymentsPriceCalculationService) {}

  public async calculateFinalPaymentPrice(
    manager: EntityManager,
    appointment: TCalculatePaymentPriceAppointment,
    payment: TCalculateFinalPaymentPricePayment,
    corporateContext: ICorporateCaptureContext,
  ): Promise<IPaymentCalculationResult> {
    const { isClientCorporate } = corporateContext;

    const recalculatedPrice = await this.paymentsPriceCalculationService.calculatePaymentEndPrice({
      appointment,
      isClientCorporate,
      isInterpreterCorporate: corporateContext.isInterpreterCorporate,
      clientCountry: corporateContext.clientCountry,
      interpreterCountry: corporateContext.interpreterCountry,
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
      paymentItem.amount !== calculatedPrice.clientAmount || paymentItem.gstAmount !== calculatedPrice.clientGstAmount
    );
  }

  private async updatePaymentItem(
    manager: EntityManager,
    paymentItem: TCalculateFinalPaymentPricePaymentItem,
    calculatedPrice: IPaymentCalculationResult,
    priceChanged: boolean,
  ): Promise<void> {
    const updatePayload = this.buildPaymentItemUpdatePayload(calculatedPrice, priceChanged);
    await manager.getRepository(PaymentItem).update({ id: paymentItem.id }, updatePayload);
  }

  private buildPaymentItemUpdatePayload(
    calculatedPrice: IPaymentCalculationResult,
    priceChanged: boolean,
  ): Partial<PaymentItem> {
    const { appliedDiscounts } = calculatedPrice;
    const payload: Partial<PaymentItem> = {};

    if (priceChanged) {
      Object.assign(payload, {
        amount: calculatedPrice.clientAmount,
        gstAmount: calculatedPrice.clientGstAmount,
        fullAmount: calculatedPrice.clientFullAmount,
      });
    }

    if (appliedDiscounts) {
      Object.assign(payload, {
        appliedPromoCode: calculatedPrice.discountRate?.promoCode ?? null,
        appliedMembershipType: calculatedPrice.discountRate?.membershipType ?? null,
        appliedPromoDiscountsPercent: calculatedPrice.discountRate?.promoCampaignDiscount ?? null,
        appliedMembershipDiscountsPercent: calculatedPrice.discountRate?.membershipDiscount ?? null,
        appliedPromoDiscountsMinutes: calculatedPrice.appliedDiscounts?.promoCampaignMinutesUsed ?? null,
        appliedMembershipFreeMinutes: calculatedPrice.appliedDiscounts?.membershipFreeMinutesUsed ?? null,
        amountOfAppliedDiscountByMembershipMinutes: calculatedPrice.appliedDiscounts?.membershipFreeMinutes ?? null,
        amountOfAppliedDiscountByMembershipDiscount: calculatedPrice.appliedDiscounts?.membershipDiscount ?? null,
        amountOfAppliedDiscountByPromoCode: calculatedPrice.appliedDiscounts?.promoCampaignDiscount ?? null,
      });
    }

    return payload;
  }

  private async updatePaymentTotals(manager: EntityManager, paymentId: string): Promise<void> {
    const authorizedItems = await manager.getRepository(PaymentItem).find({
      select: { amount: true, gstAmount: true, fullAmount: true },
      where: { payment: { id: paymentId }, status: EPaymentStatus.AUTHORIZED },
    });

    const recalculatedTotals = this.calculateTotalsFromItems(authorizedItems);

    await manager.getRepository(Payment).update(
      { id: paymentId },
      {
        totalAmount: recalculatedTotals.amount,
        totalGstAmount: recalculatedTotals.gstAmount,
        totalFullAmount: recalculatedTotals.fullAmount,
      },
    );
  }

  private calculateTotalsFromItems(items: PaymentItem[]): { amount: number; gstAmount: number; fullAmount: number } {
    let totalAmount = 0;
    let totalGstAmount = 0;
    let totalFullAmount = 0;

    for (const item of items) {
      totalAmount += Number(item.amount);
      totalGstAmount += Number(item.gstAmount);
      totalFullAmount += Number(item.fullAmount);
    }

    return {
      amount: totalAmount,
      gstAmount: totalGstAmount,
      fullAmount: totalFullAmount,
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

    const difference = Number(oldFullAmount) - Number(newFullAmount);
    const newDepositAmount = Number(company.depositAmount) + difference;

    await manager.getRepository(Company).update({ id: company.id }, { depositAmount: round2(newDepositAmount) });
  }
}
