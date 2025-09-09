import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Rate } from "src/modules/rates/entities";
import { FindOneOptions, FindOptionsSelect, FindOptionsWhere, Repository } from "typeorm";
import { OldCalculatePriceDto } from "src/modules/rates-old/common/dto";
import { OldIConvertedRateOutput } from "src/modules/rates-old/common/outputs";
import { TEN, UNDEFINED_VALUE } from "src/common/constants";
import { OldERoleType } from "src/modules/payments/common/enums";
import {
  OldIAdditionalBlockPricesForCalculation,
  OldIAdditionalBlockRatesForCalculation,
  OldICalculatePrice,
  OldIPricesForCalculation,
  OldIRatesForCalculation,
} from "src/modules/rates-old/common/interfaces";
import {
  EAppointmentInterpreterType,
  EAppointmentInterpretingType,
  EAppointmentTopic,
} from "src/modules/appointments/appointment/common/enums";
import { addMinutes, differenceInMinutes, parseISO } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { STANDARD_RATE_HOUR_END_NUMBER, STANDARD_RATE_HOUR_START_NUMBER } from "src/modules/rates/common/constants";
import { round2 } from "src/common/utils";
import { ERateDetailsSequence, ERateQualifier } from "src/modules/rates/common/enums";

@Injectable()
export class OldRatesService {
  constructor(
    @InjectRepository(Rate)
    private readonly ratesRepository: Repository<Rate>,
  ) {}

  public async calculatePriceByOneDay(
    dto: OldCalculatePriceDto,
    currentDayDuration: number,
    currentDayScheduleDateTime: string,
    clientIsGstPayer: boolean = true,
    priceFor: OldERoleType = OldERoleType.CLIENT,
    isNeedCalcAsNormalTime: boolean = false,
    isNeedCalcAsOvertime: boolean = false,
  ): Promise<OldICalculatePrice> {
    if (dto.interpretingType === EAppointmentInterpretingType.SIMULTANEOUS) {
      return await this.calculateEscortAndSimultaneousPrice(
        dto.interpretingType,
        dto.interpreterType,
        dto.topic,
        clientIsGstPayer,
        priceFor,
        currentDayDuration,
      );
    }

    if (dto.interpretingType === EAppointmentInterpretingType.ESCORT) {
      return await this.calculateEscortAndSimultaneousPrice(
        dto.interpretingType,
        dto.interpreterType,
        dto.topic,
        clientIsGstPayer,
        priceFor,
        currentDayDuration,
      );
    }

    let scheduledDateStart = parseISO(currentDayScheduleDateTime);

    if (dto.interpreterTimezone) {
      scheduledDateStart = toZonedTime(scheduledDateStart, dto.interpreterTimezone);
    }

    let scheduledDateEnd = addMinutes(scheduledDateStart, currentDayDuration);

    const normalHoursStart = new Date(scheduledDateStart);
    normalHoursStart.setHours(STANDARD_RATE_HOUR_START_NUMBER, 0, 0, 0);

    const normalHoursEnd = new Date(scheduledDateStart);
    normalHoursEnd.setHours(STANDARD_RATE_HOUR_END_NUMBER, 0, 0, 0);

    if (isNeedCalcAsNormalTime) {
      scheduledDateStart = addMinutes(normalHoursStart, TEN);
      scheduledDateEnd = addMinutes(normalHoursStart, Number(TEN) + Number(currentDayDuration));
    }

    if (isNeedCalcAsOvertime) {
      scheduledDateStart = addMinutes(normalHoursEnd, TEN);
      scheduledDateEnd = addMinutes(normalHoursEnd, Number(TEN) + Number(currentDayDuration));
    }

    const isStartBeforeNormalTime = scheduledDateStart < normalHoursStart;
    const isEndBeforeNormalTime = scheduledDateEnd < normalHoursStart;
    const isStartAfterNormalTime = scheduledDateStart > normalHoursEnd;
    const isEndAfterNormalTime = scheduledDateEnd > normalHoursEnd;

    const rates = await this.getRatesForCalculator(
      dto,
      isStartBeforeNormalTime,
      isEndAfterNormalTime,
      currentDayDuration,
      clientIsGstPayer,
      priceFor,
    );

    const { basePriceStandardHours, additionalPriceStandardHours, basePriceAfterHours, additionalPriceAfterHours } =
      this.getPricesPerTime(dto.topic, rates, clientIsGstPayer, priceFor);

    if ((isStartBeforeNormalTime && isEndBeforeNormalTime) || (isStartAfterNormalTime && isEndAfterNormalTime)) {
      return this.calculateIfAppointmentFullyInPeakTime(
        currentDayDuration,
        basePriceAfterHours,
        additionalPriceAfterHours,
        rates.rateAfterHoursFirstMinutes?.detailsTime,
        rates.rateAfterHoursAdditionalBlock?.detailsTime,
      );
    } else if (
      (isStartBeforeNormalTime && !isEndBeforeNormalTime) ||
      (isEndAfterNormalTime && !isStartAfterNormalTime)
    ) {
      let minutesBeforePeak = differenceInMinutes(normalHoursEnd, scheduledDateStart);

      if (isStartBeforeNormalTime) {
        minutesBeforePeak = differenceInMinutes(normalHoursStart, scheduledDateStart);
      }

      return this.calculateIfAppointmentStartAndEndInDifferentTimes(
        isStartBeforeNormalTime,
        minutesBeforePeak,
        currentDayDuration,
        basePriceStandardHours,
        additionalPriceStandardHours,
        rates.rateStandardHoursFirstMinutes.detailsTime,
        rates.rateStandardHoursAdditionalBlock?.detailsTime,
        basePriceAfterHours,
        additionalPriceAfterHours,
        rates.rateAfterHoursFirstMinutes?.detailsTime,
        rates.rateAfterHoursAdditionalBlock?.detailsTime,
      );
    } else {
      return this.calculateIfAppointmentFullyInNormalTime(
        currentDayDuration,
        basePriceStandardHours,
        additionalPriceStandardHours,
        rates.rateStandardHoursFirstMinutes.detailsTime,
        rates.rateStandardHoursAdditionalBlock?.detailsTime,
      );
    }
  }

  private async calculateEscortAndSimultaneousPrice(
    interpretingType: EAppointmentInterpretingType,
    interpreterType: EAppointmentInterpreterType,
    topic: EAppointmentTopic,
    clientIsGstPayer: boolean,
    priceFor: OldERoleType,
    duration: number,
  ): Promise<OldICalculatePrice> {
    const rate = await this.getRate({
      where: { interpretingType, interpreterType },
      select: {
        paidByTakerSpecialWithGst: true,
        paidByTakerGeneralWithGst: true,
        paidByTakerSpecialWithoutGst: true,
        paidByTakerGeneralWithoutGst: true,
        paidToInterpreterSpecialWithGst: true,
        paidToInterpreterGeneralWithGst: true,
        paidToInterpreterSpecialWithoutGst: true,
        paidToInterpreterGeneralWithoutGst: true,
      },
    });

    let price: number | null | undefined = null;

    if (topic === EAppointmentTopic.LEGAL || topic === EAppointmentTopic.MEDICAL) {
      if (clientIsGstPayer) {
        if (priceFor === OldERoleType.CLIENT) {
          price = rate.paidByTakerSpecialWithGst;
        } else {
          price = rate.paidToInterpreterSpecialWithGst;
        }
      } else {
        if (priceFor === OldERoleType.CLIENT) {
          price = rate.paidByTakerSpecialWithoutGst;
        } else {
          price = rate.paidToInterpreterSpecialWithoutGst;
        }
      }
    } else {
      if (clientIsGstPayer) {
        if (priceFor === OldERoleType.CLIENT) {
          price = rate.paidByTakerSpecialWithGst;
        } else {
          price = rate.paidByTakerSpecialWithGst;
        }
      } else {
        if (priceFor === OldERoleType.CLIENT) {
          price = rate.paidByTakerSpecialWithGst;
        } else {
          price = rate.paidByTakerSpecialWithGst;
        }
      }
    }

    if (!price) {
      throw new BadRequestException("Incorrect parameter combination!");
    }

    return {
      price: round2(price),
      priceByBlocks: [{ duration, price: round2(price) }],
      addedDurationToLastBlockWhenRounding: 0,
    };
  }

  private async getRatesForCalculator(
    dto: OldCalculatePriceDto,
    isStartBeforeNormalTime: boolean,
    isEndAfterNormalTime: boolean,
    currentDayDuration: number,
    clientIsGstPayer: boolean,
    priceFor: OldERoleType,
  ): Promise<OldIRatesForCalculation> {
    const where: FindOptionsWhere<Rate> = {
      interpreterType: dto.interpreterType,
      schedulingType: dto.schedulingType,
      communicationType: dto.communicationType,
      interpretingType: dto.interpretingType,
    };

    const select: FindOptionsSelect<Rate> = {
      detailsTime: true,
    };

    if (clientIsGstPayer && priceFor === OldERoleType.CLIENT) {
      select.paidByTakerSpecialWithGst = true;
      select.paidByTakerGeneralWithGst = true;
    } else if (!clientIsGstPayer && priceFor === OldERoleType.CLIENT) {
      select.paidByTakerSpecialWithoutGst = true;
      select.paidByTakerGeneralWithoutGst = true;
    } else if (clientIsGstPayer && priceFor === OldERoleType.INTERPRETER) {
      select.paidToInterpreterSpecialWithGst = true;
      select.paidToInterpreterGeneralWithGst = true;
    } else if (!clientIsGstPayer && priceFor === OldERoleType.INTERPRETER) {
      select.paidToInterpreterSpecialWithoutGst = true;
      select.paidToInterpreterGeneralWithoutGst = true;
    }

    const rateStandardHoursFirstMinutes = await this.getRate({
      where: {
        ...where,
        qualifier: ERateQualifier.STANDARD_HOURS,
        detailsSequence: ERateDetailsSequence.FIRST_MINUTES,
      },
      select,
    });

    let rateStandardHoursAdditionalBlock: OldIConvertedRateOutput | null = null;

    if (currentDayDuration > Number(rateStandardHoursFirstMinutes.detailsTime)) {
      rateStandardHoursAdditionalBlock = await this.getRate({
        where: {
          ...where,
          qualifier: ERateQualifier.STANDARD_HOURS,
          detailsSequence: ERateDetailsSequence.ADDITIONAL_BLOCK,
        },
        select,
      });
    }

    let rateAfterHoursFirstMinutes: OldIConvertedRateOutput | null = null;
    let rateAfterHoursAdditionalBlock: OldIConvertedRateOutput | null = null;

    if (isStartBeforeNormalTime || isEndAfterNormalTime) {
      rateAfterHoursFirstMinutes = await this.getRate({
        where: {
          ...where,
          qualifier: ERateQualifier.AFTER_HOURS,
          detailsSequence: ERateDetailsSequence.FIRST_MINUTES,
        },
        select,
      });

      if (currentDayDuration > Number(rateAfterHoursFirstMinutes.detailsTime)) {
        rateAfterHoursAdditionalBlock = await this.getRate({
          where: {
            ...where,
            qualifier: ERateQualifier.AFTER_HOURS,
            detailsSequence: ERateDetailsSequence.ADDITIONAL_BLOCK,
          },
          select,
        });
      }
    }

    return {
      rateStandardHoursFirstMinutes,
      rateStandardHoursAdditionalBlock,
      rateAfterHoursFirstMinutes,
      rateAfterHoursAdditionalBlock,
    };
  }

  private getPricesPerTime(
    topic: EAppointmentTopic,
    rates: OldIRatesForCalculation,
    clientIsGstPayer: boolean = true,
    priceFor: OldERoleType = OldERoleType.CLIENT,
  ): OldIPricesForCalculation {
    let basePriceStandardHours: number | null = null;
    let additionalPriceStandardHours: number | null | undefined = null;
    let basePriceAfterHours: number | null | undefined = null;
    let additionalPriceAfterHours: number | null | undefined = null;

    if (topic === EAppointmentTopic.LEGAL || topic === EAppointmentTopic.MEDICAL) {
      if (clientIsGstPayer) {
        if (priceFor === OldERoleType.CLIENT) {
          basePriceStandardHours = rates.rateStandardHoursFirstMinutes.paidByTakerSpecialWithGst;
          additionalPriceStandardHours = rates.rateStandardHoursAdditionalBlock?.paidByTakerSpecialWithGst;
          basePriceAfterHours = rates.rateAfterHoursFirstMinutes?.paidByTakerSpecialWithGst;
          additionalPriceAfterHours = rates.rateAfterHoursAdditionalBlock?.paidByTakerSpecialWithGst;
        } else {
          basePriceStandardHours = rates.rateStandardHoursFirstMinutes.paidToInterpreterSpecialWithGst;
          additionalPriceStandardHours = rates.rateStandardHoursAdditionalBlock?.paidToInterpreterSpecialWithGst;
          basePriceAfterHours = rates.rateAfterHoursFirstMinutes?.paidToInterpreterSpecialWithGst;
          additionalPriceAfterHours = rates.rateAfterHoursAdditionalBlock?.paidToInterpreterSpecialWithGst;
        }
      } else {
        if (priceFor === OldERoleType.CLIENT) {
          basePriceStandardHours = rates.rateStandardHoursFirstMinutes.paidByTakerSpecialWithoutGst;
          additionalPriceStandardHours = rates.rateStandardHoursAdditionalBlock?.paidByTakerSpecialWithoutGst;
          basePriceAfterHours = rates.rateAfterHoursFirstMinutes?.paidByTakerSpecialWithoutGst;
          additionalPriceAfterHours = rates.rateAfterHoursAdditionalBlock?.paidByTakerSpecialWithoutGst;
        } else {
          basePriceStandardHours = rates.rateStandardHoursFirstMinutes.paidToInterpreterSpecialWithoutGst;
          additionalPriceStandardHours = rates.rateStandardHoursAdditionalBlock?.paidToInterpreterSpecialWithoutGst;
          basePriceAfterHours = rates.rateAfterHoursFirstMinutes?.paidToInterpreterSpecialWithoutGst;
          additionalPriceAfterHours = rates.rateAfterHoursAdditionalBlock?.paidToInterpreterSpecialWithoutGst;
        }
      }
    } else {
      if (clientIsGstPayer) {
        if (priceFor === OldERoleType.CLIENT) {
          basePriceStandardHours = rates.rateStandardHoursFirstMinutes.paidByTakerGeneralWithGst;
          additionalPriceStandardHours = rates.rateStandardHoursAdditionalBlock?.paidByTakerGeneralWithGst;
          basePriceAfterHours = rates.rateAfterHoursFirstMinutes?.paidByTakerGeneralWithGst;
          additionalPriceAfterHours = rates.rateAfterHoursAdditionalBlock?.paidByTakerGeneralWithGst;
        } else {
          basePriceStandardHours = rates.rateStandardHoursFirstMinutes.paidToInterpreterGeneralWithGst;
          additionalPriceStandardHours = rates.rateStandardHoursAdditionalBlock?.paidToInterpreterGeneralWithGst;
          basePriceAfterHours = rates.rateAfterHoursFirstMinutes?.paidToInterpreterGeneralWithGst;
          additionalPriceAfterHours = rates.rateAfterHoursAdditionalBlock?.paidToInterpreterGeneralWithGst;
        }
      } else {
        if (priceFor === OldERoleType.CLIENT) {
          basePriceStandardHours = rates.rateStandardHoursFirstMinutes.paidByTakerGeneralWithoutGst;
          additionalPriceStandardHours = rates.rateStandardHoursAdditionalBlock?.paidByTakerGeneralWithoutGst;
          basePriceAfterHours = rates.rateAfterHoursFirstMinutes?.paidByTakerGeneralWithoutGst;
          additionalPriceAfterHours = rates.rateAfterHoursAdditionalBlock?.paidByTakerGeneralWithoutGst;
        } else {
          basePriceStandardHours = rates.rateStandardHoursFirstMinutes.paidToInterpreterGeneralWithoutGst;
          additionalPriceStandardHours = rates.rateStandardHoursAdditionalBlock?.paidToInterpreterGeneralWithoutGst;
          basePriceAfterHours = rates.rateAfterHoursFirstMinutes?.paidToInterpreterGeneralWithoutGst;
          additionalPriceAfterHours = rates.rateAfterHoursAdditionalBlock?.paidToInterpreterGeneralWithoutGst;
        }
      }
    }

    return {
      basePriceStandardHours,
      additionalPriceStandardHours,
      basePriceAfterHours,
      additionalPriceAfterHours,
    };
  }

  private calculateIfAppointmentFullyInNormalTime(
    duration: number,
    basePrice: number | null | undefined,
    additionalPrice: number | null | undefined,
    baseDuration: number | null | undefined,
    additionalDuration: number | null | undefined,
  ): OldICalculatePrice {
    const appointmentPrice = this.calculateBaseRate(
      duration,
      basePrice,
      additionalPrice,
      baseDuration,
      additionalDuration,
    );

    return appointmentPrice;
  }

  private calculateIfAppointmentStartAndEndInDifferentTimes(
    isStartBeforeNormalTime: boolean,
    minutesBeforePeak: number,
    duration: number,
    basePriceStandardHours: number | null | undefined,
    additionalPriceStandardHours: number | null | undefined,
    baseTimeStandardHours: number | null | undefined,
    additionalTimeStandardHours: number | null | undefined,
    basePriceAfterHours: number | null | undefined,
    additionalPriceAfterHours: number | null | undefined,
    baseTimeAfterHours: number | null | undefined,
    additionalTimeAfterHours: number | null | undefined,
  ): OldICalculatePrice {
    if (!basePriceStandardHours || !basePriceAfterHours || !baseTimeStandardHours || !baseTimeAfterHours) {
      throw new BadRequestException("Incorrect parameter combination!");
    }

    let baseTimeFirst = baseTimeStandardHours;
    let basePriceFirst = basePriceStandardHours;
    let baseTimeSecond = baseTimeAfterHours;
    let basePriceSecond = basePriceAfterHours;

    let additionalTimeFirst = additionalTimeStandardHours;
    let additionalPriceFirst = additionalPriceStandardHours;
    let additionalTimeSecond = additionalTimeAfterHours;
    let additionalPriceSecond = additionalPriceAfterHours;

    if (isStartBeforeNormalTime) {
      baseTimeFirst = baseTimeAfterHours;
      basePriceFirst = basePriceAfterHours;
      baseTimeSecond = baseTimeStandardHours;
      basePriceSecond = basePriceStandardHours;

      additionalTimeFirst = additionalTimeAfterHours;
      additionalPriceFirst = additionalPriceAfterHours;
      additionalTimeSecond = additionalTimeStandardHours;
      additionalPriceSecond = additionalPriceStandardHours;
    }

    const prePeakDuration = minutesBeforePeak;
    let lessDuration = duration;
    let peakIsCalculated = false;
    let calculatedDuration = 0;

    const result: OldICalculatePrice = {
      price: 0,
      priceByBlocks: [],
      addedDurationToLastBlockWhenRounding: 0,
    };

    if (baseTimeFirst <= prePeakDuration) {
      result.price += round2(basePriceFirst);
      result.priceByBlocks.push({ price: round2(basePriceFirst), duration: baseTimeFirst });
      result.addedDurationToLastBlockWhenRounding = baseTimeFirst - duration;

      calculatedDuration += baseTimeFirst;
    } else {
      const baseTimePrePeakDuration = prePeakDuration;
      const baseTimePostPeakDuration = baseTimeFirst - baseTimePrePeakDuration;

      const pricePrePeak = round2((basePriceFirst / baseTimeFirst) * baseTimePrePeakDuration);
      result.price += pricePrePeak;
      result.priceByBlocks.push({ price: pricePrePeak, duration: baseTimePrePeakDuration });

      const pricePostPeak = round2((basePriceSecond / baseTimeSecond) * baseTimePostPeakDuration);
      result.price += pricePostPeak;
      result.priceByBlocks.push({ price: pricePostPeak, duration: baseTimePostPeakDuration });

      result.addedDurationToLastBlockWhenRounding = baseTimeFirst - duration;

      calculatedDuration += baseTimeFirst;

      peakIsCalculated = true;
    }

    lessDuration -= baseTimeFirst;

    if (lessDuration <= 0) {
      return result;
    }

    let currentTimeMark = baseTimeFirst;

    if (!additionalPriceFirst || !additionalPriceSecond || !additionalTimeFirst || !additionalTimeSecond) {
      throw new BadRequestException("Incorrect parameter combination!");
    }

    while (lessDuration > 0) {
      if (currentTimeMark + additionalTimeFirst <= prePeakDuration) {
        result.price += round2(additionalPriceFirst);
        result.priceByBlocks.push({
          price: round2(additionalPriceFirst),
          duration: additionalTimeFirst,
        });
        calculatedDuration += additionalTimeFirst;
        result.addedDurationToLastBlockWhenRounding = calculatedDuration - duration;
      } else if (peakIsCalculated) {
        result.price += round2(additionalPriceSecond);
        result.priceByBlocks.push({ price: round2(additionalPriceSecond), duration: additionalTimeSecond });
        calculatedDuration += additionalTimeSecond;
        result.addedDurationToLastBlockWhenRounding = calculatedDuration - duration;
      } else {
        const additionalTimePrePeakDuration = prePeakDuration - currentTimeMark;

        const additionalTimePostPeakDuration = additionalTimeFirst - additionalTimePrePeakDuration;

        const pricePrePeak = round2((additionalPriceFirst / additionalTimeFirst) * additionalTimePrePeakDuration);
        result.price += pricePrePeak;
        result.priceByBlocks.push({ price: pricePrePeak, duration: additionalTimePrePeakDuration });

        const pricePostPeak = round2((additionalPriceSecond / additionalTimeSecond) * additionalTimePostPeakDuration);
        result.price += pricePostPeak;
        result.priceByBlocks.push({ price: pricePostPeak, duration: additionalTimePostPeakDuration });

        calculatedDuration += additionalTimeFirst;
        result.addedDurationToLastBlockWhenRounding = calculatedDuration - duration;

        peakIsCalculated = true;
      }

      currentTimeMark += additionalTimeFirst;
      lessDuration -= additionalTimeFirst;
    }

    return result;
  }

  private calculateIfAppointmentFullyInPeakTime(
    duration: number,
    basePrice: number | null | undefined,
    additionalPrice: number | null | undefined,
    baseDuration: number | null | undefined,
    additionalDuration: number | null | undefined,
  ): OldICalculatePrice {
    const appointmentPrice = this.calculateBaseRate(
      duration,
      basePrice,
      additionalPrice,
      baseDuration,
      additionalDuration,
    );

    return appointmentPrice;
  }

  private calculateBaseRate(
    duration: number,
    basePrice: number | null | undefined,
    additionalPrice: number | null | undefined,
    baseDuration: number | null | undefined,
    additionalDuration: number | null | undefined,
  ): OldICalculatePrice {
    if (!basePrice || !baseDuration) {
      throw new BadRequestException("Incorrect parameter combination!");
    }

    const result: OldICalculatePrice = {
      price: round2(basePrice),
      priceByBlocks: [{ price: round2(basePrice), duration: baseDuration }],
      addedDurationToLastBlockWhenRounding: baseDuration - duration,
    };

    if (duration <= baseDuration) {
      return result;
    }

    if (!additionalPrice || !additionalDuration) {
      throw new BadRequestException("Incorrect parameter combination!");
    }

    const extraMinutes = duration - baseDuration;
    const extraBlocks = Math.ceil(extraMinutes / additionalDuration);
    const extraBlocksDuration = extraBlocks * additionalDuration;

    result.price += extraBlocks * additionalPrice;

    for (let i = 0; i < extraBlocks; i++) {
      result.priceByBlocks.push({ price: additionalPrice, duration: additionalDuration });
    }

    result.addedDurationToLastBlockWhenRounding = extraBlocksDuration - extraMinutes;

    return result;
  }

  public async calculateAdditionalBlockPrice(
    dto: OldCalculatePriceDto,
    currentBlockDuration: number,
    currentBlockScheduleDateTime: string,
    clientIsGstPayer: boolean = true,
    priceFor: OldERoleType = OldERoleType.CLIENT,
  ): Promise<OldICalculatePrice> {
    let scheduledDateStart = parseISO(currentBlockScheduleDateTime);

    if (dto.interpreterTimezone) {
      scheduledDateStart = toZonedTime(scheduledDateStart, dto.interpreterTimezone);
    }

    const scheduledDateEnd = addMinutes(scheduledDateStart, currentBlockDuration);

    const normalHoursStart = new Date(scheduledDateStart);
    normalHoursStart.setHours(STANDARD_RATE_HOUR_START_NUMBER, 0, 0, 0);

    const normalHoursEnd = new Date(scheduledDateStart);
    normalHoursEnd.setHours(STANDARD_RATE_HOUR_END_NUMBER, 0, 0, 0);

    const isStartBeforeNormalTime = scheduledDateStart < normalHoursStart;
    const isEndBeforeNormalTime = scheduledDateEnd < normalHoursStart;
    const isStartAfterNormalTime = scheduledDateStart > normalHoursEnd;
    const isEndAfterNormalTime = scheduledDateEnd > normalHoursEnd;

    const rates = await this.getAdditionalBlockRatesForCalculator(
      dto,
      isStartBeforeNormalTime,
      isEndAfterNormalTime,
      clientIsGstPayer,
      priceFor,
    );

    const { additionalPriceStandardHours, additionalPriceAfterHours } = this.getAdditionalBlockPricesPerTime(
      dto.topic,
      rates,
      clientIsGstPayer,
      priceFor,
    );

    if ((isStartBeforeNormalTime && isEndBeforeNormalTime) || (isStartAfterNormalTime && isEndAfterNormalTime)) {
      return this.calculateAdditionalBlockIfFullyInPeakOrNormalTime(
        additionalPriceAfterHours,
        rates.rateAfterHoursAdditionalBlock?.detailsTime,
      );
    } else if (
      (isStartBeforeNormalTime && !isEndBeforeNormalTime) ||
      (isEndAfterNormalTime && !isStartAfterNormalTime)
    ) {
      let minutesBeforePeak = differenceInMinutes(normalHoursEnd, scheduledDateStart);

      if (isStartBeforeNormalTime) {
        minutesBeforePeak = differenceInMinutes(normalHoursStart, scheduledDateStart);
      }

      return this.calculateAdditionalBlockIfStartAndEndInDifferentTimes(
        isStartBeforeNormalTime,
        minutesBeforePeak,
        additionalPriceStandardHours,
        rates.rateStandardHoursAdditionalBlock?.detailsTime,
        additionalPriceAfterHours,
        rates.rateAfterHoursAdditionalBlock?.detailsTime,
      );
    } else {
      return this.calculateAdditionalBlockIfFullyInPeakOrNormalTime(
        additionalPriceStandardHours,
        rates.rateStandardHoursAdditionalBlock?.detailsTime,
      );
    }
  }

  private async getAdditionalBlockRatesForCalculator(
    dto: OldCalculatePriceDto,
    isStartBeforeNormalTime: boolean,
    isEndAfterNormalTime: boolean,
    clientIsGstPayer: boolean,
    priceFor: OldERoleType,
  ): Promise<OldIAdditionalBlockRatesForCalculation> {
    const where: FindOptionsWhere<Rate> = {
      interpreterType: dto.interpreterType,
      schedulingType: dto.schedulingType,
      communicationType: dto.communicationType,
      interpretingType: dto.interpretingType,
    };

    const select: FindOptionsSelect<Rate> = {
      detailsTime: true,
    };

    if (clientIsGstPayer && priceFor === OldERoleType.CLIENT) {
      select.paidByTakerSpecialWithGst = true;
      select.paidByTakerGeneralWithGst = true;
    } else if (!clientIsGstPayer && priceFor === OldERoleType.CLIENT) {
      select.paidByTakerSpecialWithoutGst = true;
      select.paidByTakerGeneralWithoutGst = true;
    } else if (clientIsGstPayer && priceFor === OldERoleType.INTERPRETER) {
      select.paidToInterpreterSpecialWithGst = true;
      select.paidToInterpreterGeneralWithGst = true;
    } else if (!clientIsGstPayer && priceFor === OldERoleType.INTERPRETER) {
      select.paidToInterpreterSpecialWithoutGst = true;
      select.paidToInterpreterGeneralWithoutGst = true;
    }

    const rateStandardHoursAdditionalBlock = await this.getRate({
      where: {
        ...where,
        qualifier: ERateQualifier.STANDARD_HOURS,
        detailsSequence: ERateDetailsSequence.ADDITIONAL_BLOCK,
      },
      select,
    });

    let rateAfterHoursAdditionalBlock: OldIConvertedRateOutput | null = null;

    if (isStartBeforeNormalTime || isEndAfterNormalTime) {
      rateAfterHoursAdditionalBlock = await this.getRate({
        where: {
          ...where,
          qualifier: ERateQualifier.AFTER_HOURS,
          detailsSequence: ERateDetailsSequence.ADDITIONAL_BLOCK,
        },
        select,
      });
    }

    return {
      rateStandardHoursAdditionalBlock,
      rateAfterHoursAdditionalBlock,
    };
  }

  private getAdditionalBlockPricesPerTime(
    topic: EAppointmentTopic,
    rates: OldIAdditionalBlockRatesForCalculation,
    clientIsGstPayer: boolean = true,
    priceFor: OldERoleType = OldERoleType.CLIENT,
  ): OldIAdditionalBlockPricesForCalculation {
    let additionalPriceStandardHours: number | null | undefined = null;
    let additionalPriceAfterHours: number | null | undefined = null;

    if (topic === EAppointmentTopic.LEGAL || topic === EAppointmentTopic.MEDICAL) {
      if (clientIsGstPayer) {
        if (priceFor === OldERoleType.CLIENT) {
          additionalPriceStandardHours = rates.rateStandardHoursAdditionalBlock?.paidByTakerSpecialWithGst;
          additionalPriceAfterHours = rates.rateAfterHoursAdditionalBlock?.paidByTakerSpecialWithGst;
        } else {
          additionalPriceStandardHours = rates.rateStandardHoursAdditionalBlock?.paidToInterpreterSpecialWithGst;
          additionalPriceAfterHours = rates.rateAfterHoursAdditionalBlock?.paidToInterpreterSpecialWithGst;
        }
      } else {
        if (priceFor === OldERoleType.CLIENT) {
          additionalPriceStandardHours = rates.rateStandardHoursAdditionalBlock?.paidByTakerSpecialWithoutGst;
          additionalPriceAfterHours = rates.rateAfterHoursAdditionalBlock?.paidByTakerSpecialWithoutGst;
        } else {
          additionalPriceStandardHours = rates.rateStandardHoursAdditionalBlock?.paidToInterpreterSpecialWithoutGst;
          additionalPriceAfterHours = rates.rateAfterHoursAdditionalBlock?.paidToInterpreterSpecialWithoutGst;
        }
      }
    } else {
      if (clientIsGstPayer) {
        if (priceFor === OldERoleType.CLIENT) {
          additionalPriceStandardHours = rates.rateStandardHoursAdditionalBlock?.paidByTakerGeneralWithGst;
          additionalPriceAfterHours = rates.rateAfterHoursAdditionalBlock?.paidByTakerGeneralWithGst;
        } else {
          additionalPriceStandardHours = rates.rateStandardHoursAdditionalBlock?.paidToInterpreterGeneralWithGst;
          additionalPriceAfterHours = rates.rateAfterHoursAdditionalBlock?.paidToInterpreterGeneralWithGst;
        }
      } else {
        if (priceFor === OldERoleType.CLIENT) {
          additionalPriceStandardHours = rates.rateStandardHoursAdditionalBlock?.paidByTakerGeneralWithoutGst;
          additionalPriceAfterHours = rates.rateAfterHoursAdditionalBlock?.paidByTakerGeneralWithoutGst;
        } else {
          additionalPriceStandardHours = rates.rateStandardHoursAdditionalBlock?.paidToInterpreterGeneralWithoutGst;
          additionalPriceAfterHours = rates.rateAfterHoursAdditionalBlock?.paidToInterpreterGeneralWithoutGst;
        }
      }
    }

    return {
      additionalPriceStandardHours,
      additionalPriceAfterHours,
    };
  }

  private calculateAdditionalBlockIfFullyInPeakOrNormalTime(
    additionalPrice: number | null | undefined,
    additionalDuration: number | null | undefined,
  ): OldICalculatePrice {
    if (!additionalPrice || !additionalDuration) {
      throw new BadRequestException("Incorrect parameter combination!");
    }

    const appointmentPrice = additionalPrice;

    return {
      price: round2(appointmentPrice),
      priceByBlocks: [
        {
          price: round2(appointmentPrice),
          duration: additionalDuration,
        },
      ],
      addedDurationToLastBlockWhenRounding: 0,
    };
  }

  private calculateAdditionalBlockIfStartAndEndInDifferentTimes(
    isStartBeforeNormalTime: boolean,
    minutesBeforePeak: number,
    additionalPriceStandardHours: number | null | undefined,
    additionalTimeStandardHours: number | null | undefined,
    additionalPriceAfterHours: number | null | undefined,
    additionalTimeAfterHours: number | null | undefined,
  ): OldICalculatePrice {
    if (
      !additionalPriceStandardHours ||
      !additionalPriceAfterHours ||
      !additionalTimeStandardHours ||
      !additionalTimeAfterHours
    ) {
      throw new BadRequestException("Incorrect parameter combination!");
    }

    let additionalTimeFirst = additionalTimeStandardHours;
    let additionalPriceFirst = additionalPriceStandardHours;
    let additionalTimeSecond = additionalTimeAfterHours;
    let additionalPriceSecond = additionalPriceAfterHours;

    if (isStartBeforeNormalTime) {
      additionalTimeFirst = additionalTimeAfterHours;
      additionalPriceFirst = additionalPriceAfterHours;
      additionalTimeSecond = additionalTimeStandardHours;
      additionalPriceSecond = additionalPriceStandardHours;
    }

    const additionalTimePrePeakDuration = minutesBeforePeak;
    const additionalTimePostPeakDuration = additionalTimeFirst - additionalTimePrePeakDuration;

    const firstPartPrice = (additionalPriceFirst / additionalTimeFirst) * additionalTimePrePeakDuration;
    const secondPartPrice = (additionalPriceSecond / additionalTimeSecond) * additionalTimePostPeakDuration;

    return {
      price: round2(round2(firstPartPrice) + round2(secondPartPrice)),
      priceByBlocks: [
        {
          price: round2(firstPartPrice),
          duration: additionalTimePrePeakDuration,
        },
        {
          price: round2(secondPartPrice),
          duration: additionalTimePostPeakDuration,
        },
      ],
      addedDurationToLastBlockWhenRounding: 0,
    };
  }

  private async getRate(options: FindOneOptions<Rate>): Promise<OldIConvertedRateOutput> {
    const rate = await this.ratesRepository.findOne(options);

    if (!rate) {
      throw new BadRequestException("Incorrect parameter combination!");
    }

    return this.transformRateToNumbers(rate);
  }

  private transformRateToNumbers(rate: Rate): OldIConvertedRateOutput {
    const transformedRate = {
      ...rate,
      paidByTakerGeneralWithGst: Number(rate.paidByTakerGeneralWithGst),
      paidByTakerGeneralWithoutGst: Number(rate.paidByTakerGeneralWithoutGst),
      paidByTakerSpecialWithGst:
        rate.paidByTakerSpecialWithGst !== null && rate.paidByTakerSpecialWithGst !== UNDEFINED_VALUE
          ? Number(rate.paidByTakerSpecialWithGst)
          : null,
      paidByTakerSpecialWithoutGst:
        rate.paidByTakerSpecialWithoutGst !== null && rate.paidByTakerSpecialWithoutGst !== UNDEFINED_VALUE
          ? Number(rate.paidByTakerSpecialWithoutGst)
          : null,
      lfhCommissionGeneral: Number(rate.lfhCommissionGeneral),
      lfhCommissionSpecial:
        rate.lfhCommissionSpecial !== null && rate.lfhCommissionSpecial !== UNDEFINED_VALUE
          ? Number(rate.lfhCommissionSpecial)
          : null,
      paidToInterpreterGeneralWithGst: Number(rate.paidToInterpreterGeneralWithGst),
      paidToInterpreterGeneralWithoutGst: Number(rate.paidToInterpreterGeneralWithoutGst),
      paidToInterpreterSpecialWithGst:
        rate.paidToInterpreterSpecialWithGst !== null && rate.paidToInterpreterSpecialWithGst !== UNDEFINED_VALUE
          ? Number(rate.paidToInterpreterSpecialWithGst)
          : null,
      paidToInterpreterSpecialWithoutGst:
        rate.paidToInterpreterSpecialWithoutGst !== null && rate.paidToInterpreterSpecialWithoutGst !== UNDEFINED_VALUE
          ? Number(rate.paidToInterpreterSpecialWithoutGst)
          : null,
    };

    return transformedRate as OldIConvertedRateOutput;
  }
}
