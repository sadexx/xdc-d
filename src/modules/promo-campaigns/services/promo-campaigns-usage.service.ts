import { Injectable } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { isToday } from "date-fns";
import { PromoCampaign, PromoCampaignAssignment } from "src/modules/promo-campaigns/entities";
import { EPromoCampaignApplication } from "src/modules/promo-campaigns/common/enums";
import { IPromoCampaignDiscountData } from "src/modules/promo-campaigns/common/interfaces";
import {
  TApplyPromoCampaignUsage,
  TApplyPromoCampaignUsageForExtension,
  TFetchPromoCampaignDiscount,
  TShouldResetDailyLimits,
} from "src/modules/promo-campaigns/common/types";
import { PromoCampaignQueryOptionsService } from "src/modules/promo-campaigns/services";
import { findOneOrFailTyped } from "src/common/utils";
import { TLiveAppointmentCache } from "src/modules/appointments/appointment/common/types";

@Injectable()
export class PromoCampaignsUsageService {
  constructor(private readonly promoCampaignQueryOptionsService: PromoCampaignQueryOptionsService) {}

  public async fetchAndApplyPromoCampaignDiscount(
    manager: EntityManager,
    promoCampaignAssignment: TFetchPromoCampaignDiscount,
    scheduledDurationMin: number,
    membershipFreeMinutes: number,
  ): Promise<IPromoCampaignDiscountData> {
    const minutesToApply = this.calculateDiscountMinutesToApply(
      promoCampaignAssignment,
      scheduledDurationMin,
      membershipFreeMinutes,
    );
    await this.applyPromoCampaignUsage(manager, promoCampaignAssignment, minutesToApply);

    return {
      discount: promoCampaignAssignment.discount,
      discountMinutes: minutesToApply,
      promoCode: promoCampaignAssignment.promoCampaign.promoCode,
    };
  }

  public async fetchPromoCampaignDiscountForExtension(
    neededMinutes: number,
    promoCampaignAssignment: PromoCampaignAssignment,
    membershipFreeMinutes: number | null,
  ): Promise<IPromoCampaignDiscountData | null> {
    const minutesToApply = this.calculateDiscountMinutesToApply(
      promoCampaignAssignment,
      neededMinutes,
      membershipFreeMinutes,
    );

    return {
      discount: promoCampaignAssignment.discount,
      discountMinutes: minutesToApply,
      promoCode: promoCampaignAssignment.promoCampaign.promoCode,
    };
  }

  public async applyPromoCampaignUsageForExtension(
    manager: EntityManager,
    appointment: TLiveAppointmentCache,
    minutesToApply: number | null,
  ): Promise<void> {
    if (!appointment.clientId) {
      return;
    }

    const queryOptions = this.promoCampaignQueryOptionsService.applyPromoCampaignUsageForExtensionOptions(
      appointment.clientId,
    );
    const promoCampaignAssignment = await findOneOrFailTyped<TApplyPromoCampaignUsageForExtension>(
      appointment.clientId,
      manager.getRepository(PromoCampaignAssignment),
      queryOptions,
    );

    await this.applyPromoCampaignUsage(manager, promoCampaignAssignment, minutesToApply);
  }

  private calculateDiscountMinutesToApply(
    promoCampaignAssignment: TFetchPromoCampaignDiscount,
    scheduledDurationMin: number,
    membershipFreeMinutes: number | null,
  ): number {
    const availableDiscountMinutes = this.getAvailableDiscountMinutes(promoCampaignAssignment);
    const minutesLeftAfterMembership = Math.max(0, scheduledDurationMin - (membershipFreeMinutes ?? 0));

    return Math.min(availableDiscountMinutes, minutesLeftAfterMembership);
  }

  private getAvailableDiscountMinutes(promoCampaignAssignment: TFetchPromoCampaignDiscount): number {
    const { lastUsedDate, discountMinutes, promoCampaign } = promoCampaignAssignment;

    if (this.shouldResetDailyLimits(promoCampaign, lastUsedDate)) {
      return promoCampaign.discountMinutes ?? 0;
    }

    return discountMinutes ?? 0;
  }

  private async applyPromoCampaignUsage(
    manager: EntityManager,
    promoCampaignAssignment: TApplyPromoCampaignUsage,
    minutesToApply: number | null,
  ): Promise<void> {
    const newRemainingUses = this.calculateNewRemainingUses(promoCampaignAssignment);
    const newMinutesBalance = this.calculateNewMinutesBalance(promoCampaignAssignment, minutesToApply);

    await manager.getRepository(PromoCampaignAssignment).update(promoCampaignAssignment.id, {
      remainingUses: newRemainingUses,
      discountMinutes: newMinutesBalance,
      lastUsedDate: new Date(),
    });

    await this.incrementPromoCampaignUsage(manager, promoCampaignAssignment.promoCampaign.id);
  }

  private calculateNewRemainingUses(promoCampaignAssignment: TApplyPromoCampaignUsage): number | null {
    if (promoCampaignAssignment.remainingUses === null) {
      return null;
    }

    const { remainingUses, lastUsedDate, promoCampaign } = promoCampaignAssignment;

    if (this.shouldResetDailyLimits(promoCampaign, lastUsedDate)) {
      const dailyUsageLimit = promoCampaign.usageLimit ?? 0;

      return Math.max(0, dailyUsageLimit - 1);
    }

    return Math.max(0, remainingUses - 1);
  }

  private calculateNewMinutesBalance(
    promoCampaignAssignment: TApplyPromoCampaignUsage,
    minutesToApply: number | null,
  ): number {
    if (minutesToApply === null) {
      return promoCampaignAssignment.discountMinutes ?? 0;
    }

    const { discountMinutes, promoCampaign, lastUsedDate } = promoCampaignAssignment;

    if (this.shouldResetDailyLimits(promoCampaign, lastUsedDate)) {
      const dailyAllowance = promoCampaign.discountMinutes ?? 0;

      return Math.max(0, dailyAllowance - minutesToApply);
    }

    const currentBalance = discountMinutes ?? 0;

    return Math.max(0, currentBalance - minutesToApply);
  }

  private shouldResetDailyLimits(promoCampaign: TShouldResetDailyLimits, lastUsedDate: Date | null): boolean {
    return promoCampaign.application === EPromoCampaignApplication.DAILY && (!lastUsedDate || !isToday(lastUsedDate));
  }

  private async incrementPromoCampaignUsage(manager: EntityManager, id: string): Promise<void> {
    const COLUMN_NAME: keyof PromoCampaign = "totalTimesUsed";
    await manager.getRepository(PromoCampaign).increment({ id }, COLUMN_NAME, 1);
  }
}
