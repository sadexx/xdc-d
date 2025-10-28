import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, DeepPartial, FindOptionsWhere, Repository } from "typeorm";
import { OldIncomingPaymentsWaitList } from "src/modules/payments/entities";
import {
  OldIApplyDiscountByMembership,
  OldIApplyDiscountByMembershipAndPromo,
  OldIApplyDiscountByMinutes,
  OldIApplyDiscountByPromo,
  OldIApplyDiscounts,
  OldICalculateAppointmentPrices,
  OldIIsGstPayers,
  OldIRedirectPaymentToWaitList,
} from "src/modules/payments/common/interfaces";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { OldRatesService } from "src/modules/rates-old/services";
import { round2 } from "src/common/utils";
import { UserRole } from "src/modules/users/entities";
import { addMinutes, subMilliseconds } from "date-fns";
import { OldERoleType } from "src/modules/payments/common/enums";
import {
  OLD_MINUTES_BEFORE_START_AS_REASON_TO_CANCEL,
  OLD_PAYMENT_FRAMES,
} from "src/modules/payments/common/constants/old-constants";
import { EAppointmentStatus } from "src/modules/appointments/appointment/common/enums";
import { DiscountsService } from "src/modules/discounts/services";
import { GST_COEFFICIENT, NUMBER_OF_MINUTES_IN_TEN_MINUTES, ONE_HUNDRED, TEN } from "src/common/constants";
import { OldICalculatePrice } from "src/modules/rates-old/common/interfaces";
import { IDiscountRate } from "src/modules/discounts/common/interfaces";
import { OldCalculatePriceDto } from "src/modules/rates-old/common/dto";
import { HelperService } from "src/modules/helper/services";
import { TCalculateAppointmentPriceAppointment } from "src/modules/payments/common/types";

@Injectable()
export class OldPaymentsHelperService {
  public constructor(
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(OldIncomingPaymentsWaitList)
    private readonly incomingPaymentWaitListRepository: Repository<OldIncomingPaymentsWaitList>,
    private readonly ratesService: OldRatesService,
    private readonly discountsService: DiscountsService,
    private readonly helperService: HelperService,
  ) {}

  // TODO: Add Status checking for appointment in live, no update.
  public async changeAppointmentStatusToPending(appointmentId: string): Promise<void> {
    await this.appointmentRepository.update({ id: appointmentId }, { status: EAppointmentStatus.PENDING });
  }

  public getFindWaitListWhere(): FindOptionsWhere<OldIncomingPaymentsWaitList>[] {
    const currentTime = new Date();

    const where: FindOptionsWhere<OldIncomingPaymentsWaitList>[] = [];

    for (const shift of OLD_PAYMENT_FRAMES) {
      const shiftedDate = addMinutes(currentTime, shift);

      const interval = this.getPaymentFrameInterval(shiftedDate);

      where.push({
        appointment: { scheduledStartTime: Between(interval.timeframeStart, interval.timeframeEnd) },
      });
    }

    where.push({ isShortTimeSlot: true });

    return where;
  }

  public getPaymentFrameInterval(date: Date): { timeframeStart: Date; timeframeEnd: Date } {
    const minutes = date.getMinutes();
    const roundedMinutes = Math.floor(minutes / NUMBER_OF_MINUTES_IN_TEN_MINUTES) * NUMBER_OF_MINUTES_IN_TEN_MINUTES;

    const newDate = new Date(date.setMinutes(roundedMinutes, 0, 0));

    const timeframeStart = newDate;
    const timeframeEnd = subMilliseconds(addMinutes(newDate, NUMBER_OF_MINUTES_IN_TEN_MINUTES), 1);

    return { timeframeStart, timeframeEnd };
  }

  public applyDiscountByMinutesDiscount(
    duration: number,
    fullAmount: number,
    isGstPayers: OldIIsGstPayers,
    price: OldICalculatePrice,
    discountMinutes?: number,
    discountPercent: number = ONE_HUNDRED,
    isGstCalculatedBefore: boolean = false,
  ): OldIApplyDiscountByMinutes {
    let appointmentMinutesRemnant = duration;
    let isGstCalculated = false;

    if (discountMinutes && discountMinutes > 0) {
      if (duration <= discountMinutes) {
        appointmentMinutesRemnant = 0;

        if (discountPercent >= ONE_HUNDRED) {
          fullAmount = 0;
        } else {
          fullAmount -= fullAmount * (discountPercent / ONE_HUNDRED);
        }
      } else {
        appointmentMinutesRemnant = duration - discountMinutes;
        let freeMinutesRemnant = discountMinutes;

        for (const priceBlock of price.priceByBlocks) {
          if (priceBlock.price <= 0) {
            continue;
          }

          if (!isGstCalculatedBefore && isGstPayers.client) {
            const amount = priceBlock.price / GST_COEFFICIENT;
            const gstAmount = priceBlock.price - amount;
            priceBlock.price -= gstAmount;

            isGstCalculated = true;
          }

          if (freeMinutesRemnant > 0) {
            if (freeMinutesRemnant >= priceBlock.duration) {
              fullAmount -= priceBlock.price * (discountPercent / ONE_HUNDRED);
              priceBlock.price -= priceBlock.price * (discountPercent / ONE_HUNDRED);
              freeMinutesRemnant -= priceBlock.duration;
            } else {
              const blockAmountFree = (freeMinutesRemnant * priceBlock.price) / priceBlock.duration;
              fullAmount -= blockAmountFree * (discountPercent / ONE_HUNDRED);
              priceBlock.price -= blockAmountFree * (discountPercent / ONE_HUNDRED);

              const priceBlockDuration = priceBlock.duration;
              priceBlock.duration -= freeMinutesRemnant;
              freeMinutesRemnant -= priceBlockDuration;
            }

            if (freeMinutesRemnant < 0) {
              freeMinutesRemnant = 0;
            }
          } else {
            continue;
          }
        }
      }
    }

    return { fullAmount: round2(fullAmount), newPrice: price, appointmentMinutesRemnant, isGstCalculated };
  }

  // TODO: Refactor O
  public async calculateAppointmentPrice(
    appointment: TCalculateAppointmentPriceAppointment,
    date: Date,
    isCorporate: boolean,
    country: string,
    duration?: number,
    isAdditionalTime?: boolean,
    discounts?: IDiscountRate | null,
  ): Promise<OldICalculateAppointmentPrices> {
    if (!discounts) {
      discounts = await this.discountsService.fetchDiscountRate(appointment.id);
    }

    if (!duration) {
      duration = appointment.schedulingDurationMin;
    }

    const scheduleDateTime = date.toISOString();

    let isGstPayers: OldIIsGstPayers;

    if (isCorporate) {
      isGstPayers = this.helperService.isCorporateGstPayer(country);
    } else {
      isGstPayers = this.helperService.isIndividualGstPayer(country);
    }

    let timezone: string | null = null;
    let isNeedCalcAsNormalTime = false;
    let isNeedCalcAsOvertime = false;

    if (appointment.interpreterId) {
      const interpreterRole = await this.userRoleRepository.findOne({ where: { id: appointment.interpreterId } });

      if (interpreterRole) {
        timezone = interpreterRole.timezone;
      }
    } else {
      if (appointment.acceptOvertimeRates) {
        isNeedCalcAsOvertime = true;
      } else {
        isNeedCalcAsNormalTime = true;
      }
    }

    const data: OldCalculatePriceDto = {
      interpreterType: appointment.interpreterType,
      schedulingType: appointment.schedulingType,
      communicationType: appointment.communicationType,
      interpretingType: appointment.interpretingType,
      topic: appointment.topic,
      duration,
      scheduleDateTime,
      extraDays: [],
      interpreterTimezone: timezone,
    };

    let price: OldICalculatePrice | null = null;

    if (isAdditionalTime) {
      price = await this.ratesService.calculateAdditionalBlockPrice(
        data,
        duration,
        scheduleDateTime,
        isGstPayers.client,
        OldERoleType.CLIENT,
      );
    } else {
      price = await this.ratesService.calculatePriceByOneDay(
        data,
        duration,
        scheduleDateTime,
        isGstPayers.client,
        OldERoleType.CLIENT,
        isNeedCalcAsNormalTime,
        isNeedCalcAsOvertime,
      );
    }

    let startingPrice = price.price;

    let amount = startingPrice;
    let gstAmount = 0;

    if (isGstPayers.client) {
      amount = round2(startingPrice / GST_COEFFICIENT);
      gstAmount = round2(startingPrice - amount);
      startingPrice = round2(startingPrice - gstAmount);
    }

    let amountAndAppliedDiscounts: {
      amount: number;
      discountByMembershipMinutes: number;
      discountByMembershipDiscount: number;
      discountByPromoCode: number;
    } | null = null;

    if (discounts) {
      amountAndAppliedDiscounts = this.applyAppointmentDiscount(startingPrice, discounts, isGstPayers, price, duration);

      amount = amountAndAppliedDiscounts.amount;
    }

    if (isGstPayers.client) {
      gstAmount = round2(amount / TEN);
    }

    return {
      amount,
      gstAmount,
      discountByMembershipMinutes: amountAndAppliedDiscounts?.discountByMembershipMinutes || 0,
      discountByMembershipDiscount: amountAndAppliedDiscounts?.discountByMembershipDiscount || 0,
      discountByPromoCode: amountAndAppliedDiscounts?.discountByPromoCode || 0,
      discounts: discounts ?? null,
    };
  }

  public applyAppointmentDiscount(
    startingPrice: number,
    discounts: IDiscountRate | void,
    isGstPayers: OldIIsGstPayers,
    price: OldICalculatePrice,
    duration: number,
    freeMinutes?: number,
    discountMinutes?: number,
  ): OldIApplyDiscounts {
    let discountMinutesByMembership = freeMinutes;

    if (!discountMinutesByMembership && discounts && discounts.membershipFreeMinutes) {
      discountMinutesByMembership = discounts?.membershipFreeMinutes ?? 0;
    }

    let discountMinutesByPromo = discountMinutes;

    if (!discountMinutesByPromo && discounts && discounts.promoCampaignDiscountMinutes) {
      discountMinutesByPromo = discounts?.promoCampaignDiscountMinutes ?? 0;
    }

    if (!discountMinutesByPromo) {
      discountMinutesByPromo = 0;
    }

    const priceAfterFreeMinutesApplying = this.applyDiscountByMinutesDiscount(
      duration,
      startingPrice,
      isGstPayers,
      price,
      discountMinutesByMembership,
    );

    const discountByMembershipMinutes = round2(startingPrice - priceAfterFreeMinutesApplying.fullAmount);
    startingPrice = priceAfterFreeMinutesApplying.fullAmount;

    let amount = round2(startingPrice);

    let discountByMembershipDiscount = 0;
    let discountByPromoCode = 0;

    if (
      discounts &&
      priceAfterFreeMinutesApplying.appointmentMinutesRemnant > 0 &&
      priceAfterFreeMinutesApplying.fullAmount > 0
    ) {
      if (discounts.promoCampaignDiscount && discounts.membershipDiscount) {
        const amountAndAppliedDiscounts = this.applyMembershipAndPromoDiscount(
          discounts,
          priceAfterFreeMinutesApplying,
          startingPrice,
          isGstPayers,
          amount,
          discountMinutesByPromo,
        );

        amount = amountAndAppliedDiscounts.amount;
        discountByMembershipDiscount = amountAndAppliedDiscounts.discountByMembershipDiscount;
        discountByPromoCode = amountAndAppliedDiscounts.discountByPromoCode;
      } else if (discounts.promoCampaignDiscount) {
        const amountAndAppliedDiscounts = this.applyPromoDiscount(
          discounts,
          priceAfterFreeMinutesApplying,
          startingPrice,
          isGstPayers,
          amount,
          discountMinutesByPromo,
        );

        amount = amountAndAppliedDiscounts.amount;
        discountByPromoCode = amountAndAppliedDiscounts.discountByPromoCode;
      } else if (discounts.membershipDiscount) {
        const amountAndAppliedDiscounts = this.applyMembershipDiscount(discounts, amount);

        amount = amountAndAppliedDiscounts.amount;
        discountByMembershipDiscount = amountAndAppliedDiscounts.discountByMembershipDiscount;
      }
    }

    return { amount, discountByMembershipMinutes, discountByMembershipDiscount, discountByPromoCode };
  }

  public applyMembershipAndPromoDiscount(
    discounts: IDiscountRate,
    priceAfterFreeMinutesApplying: OldIApplyDiscountByMinutes,
    startingPrice: number,
    isGstPayers: OldIIsGstPayers,
    amount: number,
    discountMinutesByPromo: number,
  ): OldIApplyDiscountByMembershipAndPromo {
    let discountByPromoCode = 0;
    let discountByMembershipDiscount = 0;

    if (
      discounts.promoCampaignDiscount &&
      discounts.membershipDiscount &&
      discounts.promoCampaignDiscount > discounts.membershipDiscount
    ) {
      if (discounts.promoCampaignDiscountMinutes) {
        const priceAfterMixPromoApplying = this.applyDiscountByMinutesDiscount(
          priceAfterFreeMinutesApplying.appointmentMinutesRemnant,
          startingPrice,
          isGstPayers,
          priceAfterFreeMinutesApplying.newPrice,
          discountMinutesByPromo,
          discounts.promoCampaignDiscount,
          priceAfterFreeMinutesApplying.isGstCalculated,
        );

        discountByPromoCode = round2(startingPrice - priceAfterMixPromoApplying.fullAmount);

        if (priceAfterMixPromoApplying.fullAmount > 0) {
          amount = round2(
            priceAfterMixPromoApplying.fullAmount -
              priceAfterMixPromoApplying.fullAmount * (discounts.membershipDiscount / ONE_HUNDRED),
          );
        } else {
          amount = 0;
        }

        discountByMembershipDiscount = priceAfterMixPromoApplying.fullAmount - amount;
      } else {
        const newAmount = round2(amount - amount * (discounts.promoCampaignDiscount / ONE_HUNDRED));
        discountByPromoCode = round2(amount - newAmount);
        amount = newAmount;
      }
    } else if (discounts.membershipDiscount) {
      const newAmount = round2(amount - amount * (discounts.membershipDiscount / ONE_HUNDRED));
      discountByMembershipDiscount = round2(amount - newAmount);
      amount = newAmount;
    }

    return { discountByPromoCode, discountByMembershipDiscount, amount };
  }

  public applyPromoDiscount(
    discounts: IDiscountRate,
    priceAfterFreeMinutesApplying: OldIApplyDiscountByMinutes,
    startingPrice: number,
    isGstPayers: OldIIsGstPayers,
    amount: number,
    discountMinutesByPromo: number,
  ): OldIApplyDiscountByPromo {
    let discountByPromoCode = 0;

    if (discounts.promoCampaignDiscount) {
      if (discounts.promoCampaignDiscountMinutes) {
        const priceAfterMixPromoApplying = this.applyDiscountByMinutesDiscount(
          priceAfterFreeMinutesApplying.appointmentMinutesRemnant,
          startingPrice,
          isGstPayers,
          priceAfterFreeMinutesApplying.newPrice,
          discountMinutesByPromo,
          discounts.promoCampaignDiscount,
          priceAfterFreeMinutesApplying.isGstCalculated,
        );

        discountByPromoCode = round2(amount - priceAfterMixPromoApplying.fullAmount);

        amount = round2(priceAfterMixPromoApplying.fullAmount);
      } else {
        const newAmount = round2(amount - amount * (discounts.promoCampaignDiscount / ONE_HUNDRED));
        discountByPromoCode = round2(amount - newAmount);
        amount = newAmount;
      }
    }

    return { discountByPromoCode, amount };
  }

  public applyMembershipDiscount(discounts: IDiscountRate, amount: number): OldIApplyDiscountByMembership {
    let discountByMembershipDiscount = 0;

    if (discounts.membershipDiscount) {
      const newAmount = round2(amount - amount * (discounts.membershipDiscount / ONE_HUNDRED));
      discountByMembershipDiscount = round2(amount - newAmount);
      amount = newAmount;
    }

    return { discountByMembershipDiscount, amount };
  }

  public async redirectPaymentToWaitList(
    appointment: Appointment,
    isFirstAttemptFailed: boolean = false,
    isShortTimeSlot: boolean = false,
  ): Promise<OldIRedirectPaymentToWaitList> {
    const paymentWaitListRecord = await this.incomingPaymentWaitListRepository.findOne({
      where: { appointment: { id: appointment.id } },
    });

    if (
      new Date(appointment.scheduledStartTime) <= addMinutes(new Date(), OLD_MINUTES_BEFORE_START_AS_REASON_TO_CANCEL)
    ) {
      if (paymentWaitListRecord) {
        await this.incomingPaymentWaitListRepository.delete({ id: paymentWaitListRecord.id });
      }

      return { isNeedToCancelAppointment: true };
    }

    if (!paymentWaitListRecord) {
      const newPaymentWaitListRecordData: DeepPartial<OldIncomingPaymentsWaitList> = {
        appointment,
      };

      if (isFirstAttemptFailed) {
        newPaymentWaitListRecordData.paymentAttemptCount = 1;
      }

      if (isShortTimeSlot) {
        newPaymentWaitListRecordData.isShortTimeSlot = true;
      }

      const newPaymentWaitListRecord = this.incomingPaymentWaitListRepository.create(newPaymentWaitListRecordData);

      await this.incomingPaymentWaitListRepository.save(newPaymentWaitListRecord);
    } else if (isShortTimeSlot) {
      await this.incomingPaymentWaitListRepository.update({ id: paymentWaitListRecord.id }, { isShortTimeSlot: true });
    }

    return { isNeedToCancelAppointment: false };
  }
}
