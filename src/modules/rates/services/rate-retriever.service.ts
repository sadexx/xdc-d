import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Rate } from "src/modules/rates/entities";
import { Repository, FindOptionsWhere } from "typeorm";
import { ERateDetailsSequence, ERateQualifier, ERatesErrorCodes } from "src/modules/rates/common/enums";
import { EAppointmentInterpreterType, EAppointmentTopic } from "src/modules/appointments/appointment/common/enums";
import {
  CalculationConfig,
  IConvertedRate,
  RateFlatCollection,
  RateStandardCollection,
  SelectedFlatRatePrices,
  SelectedStandardPrices,
} from "src/modules/rates/common/interfaces";
import { TRateCollection, TSelectedPrices, TExtractPrices } from "src/modules/rates/common/types";
import { IConvertedRateOutput } from "src/modules/rates/common/outputs";
import { UpdateRateDto } from "src/modules/rates/common/dto";
import { formatRatePerMinute, formatRatePerMinuteNullable } from "src/modules/rates/common/utils";
import { NUMBER_OF_MINUTES_IN_SIX_HOURS, NUMBER_OF_SECONDS_IN_MINUTE, UNDEFINED_VALUE } from "src/common/constants";
import { RedisService } from "src/modules/redis/services";

@Injectable()
export class RateRetrieverService {
  constructor(
    @InjectRepository(Rate)
    private readonly ratesRepository: Repository<Rate>,
    private readonly redisService: RedisService,
  ) {}

  async fetchRatesForCalculation(config: CalculationConfig): Promise<TRateCollection> {
    const CACHE_TTL = NUMBER_OF_MINUTES_IN_SIX_HOURS * NUMBER_OF_SECONDS_IN_MINUTE;
    const cacheKey = this.buildCacheKey(config);
    const cachedData = await this.redisService.getJson<TRateCollection>(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    const whereConditions: FindOptionsWhere<Rate> = {
      interpreterType: config.interpreterType,
      schedulingType: config.schedulingType,
      communicationType: config.communicationType,
      interpretingType: config.interpretingType,
    };

    const result = config.isEscortOrSimultaneous
      ? await this.fetchEscortOrSimultaneousRates(whereConditions)
      : await this.fetchStandardRates(whereConditions);

    await this.redisService.setJson(cacheKey, result, CACHE_TTL);

    return result;
  }

  private buildCacheKey(config: CalculationConfig): string {
    if (config.isEscortOrSimultaneous) {
      return `rates-calculation:${config.interpreterType}:${config.schedulingType}:${config.communicationType}:${config.interpretingType}`;
    }

    return `rates-calculation:${config.interpreterType}:${config.schedulingType}:${config.communicationType}:${config.interpretingType}:standard`;
  }

  private async fetchEscortOrSimultaneousRates(whereConditions: FindOptionsWhere<Rate>): Promise<RateFlatCollection> {
    const rate = await this.ratesRepository.findOne({
      where: whereConditions,
    });

    if (!rate) {
      throw new BadRequestException(ERatesErrorCodes.RATE_NOT_FOUND_ESCORT);
    }

    const standardHoursFirstMinutes = this.transformRateToNumbers(rate);

    return {
      standardHoursFirstMinutes: standardHoursFirstMinutes,
      standardHoursAdditionalBlock: UNDEFINED_VALUE,
      afterHoursFirstMinutes: UNDEFINED_VALUE,
      afterHoursAdditionalBlock: UNDEFINED_VALUE,
    };
  }

  private async fetchStandardRates(whereConditions: FindOptionsWhere<Rate>): Promise<RateStandardCollection> {
    const NUMBER_OF_REQUIRED_RATES: number = 4;

    const rates = await this.ratesRepository.find({
      where: [
        {
          ...whereConditions,
          qualifier: ERateQualifier.STANDARD_HOURS,
          detailsSequence: ERateDetailsSequence.FIRST_MINUTES,
        },
        {
          ...whereConditions,
          qualifier: ERateQualifier.STANDARD_HOURS,
          detailsSequence: ERateDetailsSequence.ADDITIONAL_BLOCK,
        },
        {
          ...whereConditions,
          qualifier: ERateQualifier.AFTER_HOURS,
          detailsSequence: ERateDetailsSequence.FIRST_MINUTES,
        },
        {
          ...whereConditions,
          qualifier: ERateQualifier.AFTER_HOURS,
          detailsSequence: ERateDetailsSequence.ADDITIONAL_BLOCK,
        },
      ],
    });

    if (rates.length !== NUMBER_OF_REQUIRED_RATES) {
      throw new BadRequestException(ERatesErrorCodes.RATES_NOT_FOUND);
    }

    const transformedRates = rates.map((rate) => this.transformRateToNumbers(rate));
    const rateMap = new Map<string, IConvertedRate>();

    for (const rate of transformedRates) {
      const key = `${rate.qualifier}:${rate.detailsSequence}`;
      rateMap.set(key, rate);
    }

    const standardHoursFirstMinutes = rateMap.get(
      `${ERateQualifier.STANDARD_HOURS}:${ERateDetailsSequence.FIRST_MINUTES}`,
    );
    const standardHoursAdditionalBlock = rateMap.get(
      `${ERateQualifier.STANDARD_HOURS}:${ERateDetailsSequence.ADDITIONAL_BLOCK}`,
    );
    const afterHoursFirstMinutes = rateMap.get(`${ERateQualifier.AFTER_HOURS}:${ERateDetailsSequence.FIRST_MINUTES}`);
    const afterHoursAdditionalBlock = rateMap.get(
      `${ERateQualifier.AFTER_HOURS}:${ERateDetailsSequence.ADDITIONAL_BLOCK}`,
    );

    if (
      !standardHoursFirstMinutes ||
      !standardHoursAdditionalBlock ||
      !afterHoursFirstMinutes ||
      !afterHoursAdditionalBlock
    ) {
      throw new BadRequestException(ERatesErrorCodes.RATES_NOT_FOUND);
    }

    return {
      standardHoursFirstMinutes,
      standardHoursAdditionalBlock,
      afterHoursFirstMinutes,
      afterHoursAdditionalBlock,
    };
  }

  public transformRateToOutput(rate: Rate): IConvertedRateOutput {
    return {
      ...rate,
      paidByTakerGeneralWithGst: Number(rate.paidByTakerGeneralWithGst),
      paidByTakerGeneralWithoutGst: Number(rate.paidByTakerGeneralWithoutGst),
      paidByTakerSpecialWithGst:
        rate.paidByTakerSpecialWithGst !== null ? Number(rate.paidByTakerSpecialWithGst) : null,
      paidByTakerSpecialWithoutGst:
        rate.paidByTakerSpecialWithoutGst !== null ? Number(rate.paidByTakerSpecialWithoutGst) : null,
      lfhCommissionGeneral: Number(rate.lfhCommissionGeneral),
      lfhCommissionSpecial: rate.lfhCommissionSpecial !== null ? Number(rate.lfhCommissionSpecial) : null,
      paidToInterpreterGeneralWithGst: Number(rate.paidToInterpreterGeneralWithGst),
      paidToInterpreterGeneralWithoutGst: Number(rate.paidToInterpreterGeneralWithoutGst),
      paidToInterpreterSpecialWithGst:
        rate.paidToInterpreterSpecialWithGst !== null ? Number(rate.paidToInterpreterSpecialWithGst) : null,
      paidToInterpreterSpecialWithoutGst:
        rate.paidToInterpreterSpecialWithoutGst !== null ? Number(rate.paidToInterpreterSpecialWithoutGst) : null,
    };
  }

  public transformRateToNumbers(rate: Rate): IConvertedRate {
    return {
      ...rate,
      paidByTakerGeneralWithGst: Number(rate.paidByTakerGeneralWithGst),
      paidByTakerGeneralWithoutGst: Number(rate.paidByTakerGeneralWithoutGst),
      paidByTakerSpecialWithGst:
        rate.paidByTakerSpecialWithGst !== null ? Number(rate.paidByTakerSpecialWithGst) : null,
      paidByTakerSpecialWithoutGst:
        rate.paidByTakerSpecialWithoutGst !== null ? Number(rate.paidByTakerSpecialWithoutGst) : null,
      lfhCommissionGeneral: Number(rate.lfhCommissionGeneral),
      lfhCommissionSpecial: rate.lfhCommissionSpecial !== null ? Number(rate.lfhCommissionSpecial) : null,
      paidToInterpreterGeneralWithGst: Number(rate.paidToInterpreterGeneralWithGst),
      paidToInterpreterGeneralWithoutGst: Number(rate.paidToInterpreterGeneralWithoutGst),
      paidToInterpreterSpecialWithGst:
        rate.paidToInterpreterSpecialWithGst !== null ? Number(rate.paidToInterpreterSpecialWithGst) : null,
      paidToInterpreterSpecialWithoutGst:
        rate.paidToInterpreterSpecialWithoutGst !== null ? Number(rate.paidToInterpreterSpecialWithoutGst) : null,

      paidByTakerGeneralWithGstPerMinute: Number(rate.paidByTakerGeneralWithGstPerMinute),
      paidByTakerGeneralWithoutGstPerMinute: Number(rate.paidByTakerGeneralWithoutGstPerMinute),
      paidByTakerSpecialWithGstPerMinute:
        rate.paidByTakerSpecialWithGstPerMinute !== null ? Number(rate.paidByTakerSpecialWithGstPerMinute) : null,
      paidByTakerSpecialWithoutGstPerMinute:
        rate.paidByTakerSpecialWithoutGstPerMinute !== null ? Number(rate.paidByTakerSpecialWithoutGstPerMinute) : null,
      lfhCommissionGeneralPerMinute: Number(rate.lfhCommissionGeneralPerMinute),
      lfhCommissionSpecialPerMinute:
        rate.lfhCommissionSpecialPerMinute !== null ? Number(rate.lfhCommissionSpecialPerMinute) : null,
      paidToInterpreterGeneralWithGstPerMinute: Number(rate.paidToInterpreterGeneralWithGstPerMinute),
      paidToInterpreterGeneralWithoutGstPerMinute: Number(rate.paidToInterpreterGeneralWithoutGstPerMinute),
      paidToInterpreterSpecialWithGstPerMinute:
        rate.paidToInterpreterSpecialWithGstPerMinute !== null
          ? Number(rate.paidToInterpreterSpecialWithGstPerMinute)
          : null,
      paidToInterpreterSpecialWithoutGstPerMinute:
        rate.paidToInterpreterSpecialWithoutGstPerMinute !== null
          ? Number(rate.paidToInterpreterSpecialWithoutGstPerMinute)
          : null,
    };
  }

  public buildFormattedRateForCreation(rate: UpdateRateDto | Omit<IConvertedRateOutput, "id">): Partial<Rate> {
    const transformedRate: Partial<Rate> = {
      ...rate,
      paidByTakerGeneralWithGst: String(rate.paidByTakerGeneralWithGst),
      paidByTakerGeneralWithoutGst: String(rate.paidByTakerGeneralWithoutGst),
      paidByTakerSpecialWithGst:
        rate.paidByTakerSpecialWithGst !== null ? String(rate.paidByTakerSpecialWithGst) : null,
      paidByTakerSpecialWithoutGst:
        rate.paidByTakerSpecialWithoutGst !== null ? String(rate.paidByTakerSpecialWithoutGst) : null,
      lfhCommissionGeneral: String(rate.lfhCommissionGeneral),
      lfhCommissionSpecial: rate.lfhCommissionSpecial !== null ? String(rate.lfhCommissionSpecial) : null,
      paidToInterpreterGeneralWithGst: String(rate.paidToInterpreterGeneralWithGst),
      paidToInterpreterGeneralWithoutGst: String(rate.paidToInterpreterGeneralWithoutGst),
      paidToInterpreterSpecialWithGst:
        rate.paidToInterpreterSpecialWithGst !== null ? String(rate.paidToInterpreterSpecialWithGst) : null,
      paidToInterpreterSpecialWithoutGst:
        rate.paidToInterpreterSpecialWithoutGst !== null ? String(rate.paidToInterpreterSpecialWithoutGst) : null,
      paidByTakerGeneralWithGstPerMinute: formatRatePerMinute(rate.paidByTakerGeneralWithGst, rate.detailsTime),
      paidByTakerGeneralWithoutGstPerMinute: formatRatePerMinute(rate.paidByTakerGeneralWithoutGst, rate.detailsTime),
      paidByTakerSpecialWithGstPerMinute: formatRatePerMinuteNullable(rate.paidByTakerSpecialWithGst, rate.detailsTime),
      paidByTakerSpecialWithoutGstPerMinute: formatRatePerMinuteNullable(
        rate.paidByTakerSpecialWithoutGst,
        rate.detailsTime,
      ),
      lfhCommissionGeneralPerMinute: formatRatePerMinute(rate.lfhCommissionGeneral, rate.detailsTime),
      lfhCommissionSpecialPerMinute: formatRatePerMinuteNullable(rate.lfhCommissionSpecial, rate.detailsTime),
      paidToInterpreterGeneralWithGstPerMinute: formatRatePerMinute(
        rate.paidToInterpreterGeneralWithGst,
        rate.detailsTime,
      ),
      paidToInterpreterGeneralWithoutGstPerMinute: formatRatePerMinute(
        rate.paidToInterpreterGeneralWithoutGst,
        rate.detailsTime,
      ),
      paidToInterpreterSpecialWithGstPerMinute: formatRatePerMinuteNullable(
        rate.paidToInterpreterSpecialWithGst,
        rate.detailsTime,
      ),
      paidToInterpreterSpecialWithoutGstPerMinute: formatRatePerMinuteNullable(
        rate.paidToInterpreterSpecialWithoutGst,
        rate.detailsTime,
      ),
    };

    return transformedRate;
  }

  public selectPriceFields(rates: TRateCollection, config: CalculationConfig): TSelectedPrices {
    if (config.isEscortOrSimultaneous && this.isFlatRateCollection(rates)) {
      return this.selectFlatRatePrices(rates, config);
    } else {
      return this.selectStandardPrices(rates as RateStandardCollection, config);
    }
  }

  private isFlatRateCollection(rates: TRateCollection): rates is RateFlatCollection {
    return (
      rates.standardHoursAdditionalBlock === UNDEFINED_VALUE &&
      rates.afterHoursFirstMinutes === UNDEFINED_VALUE &&
      rates.afterHoursAdditionalBlock === UNDEFINED_VALUE
    );
  }

  private selectFlatRatePrices(rates: RateFlatCollection, config: CalculationConfig): SelectedFlatRatePrices {
    const { topic, interpreterType, clientIsGstPayer, interpreterIsGstPayer } = config;

    const isSpecialTopic = topic === EAppointmentTopic.LEGAL || topic === EAppointmentTopic.MEDICAL;
    const isProfessionalInterpreter = interpreterType === EAppointmentInterpreterType.IND_PROFESSIONAL_INTERPRETER;
    const useSpecialPricing = isSpecialTopic && isProfessionalInterpreter;
    const standardFirst = this.extractPrices(
      rates.standardHoursFirstMinutes,
      useSpecialPricing,
      clientIsGstPayer,
      interpreterIsGstPayer,
    );

    return {
      client: {
        basePriceStandardPerMinute: standardFirst.client,
        additionalPriceStandardPerMinute: UNDEFINED_VALUE,
        basePriceAfterHoursPerMinute: UNDEFINED_VALUE,
        additionalPriceAfterHoursPerMinute: UNDEFINED_VALUE,
      },
      interpreter: {
        basePriceStandardPerMinute: standardFirst.interpreter,
        additionalPriceStandardPerMinute: UNDEFINED_VALUE,
        basePriceAfterHoursPerMinute: UNDEFINED_VALUE,
        additionalPriceAfterHoursPerMinute: UNDEFINED_VALUE,
      },
    };
  }

  private selectStandardPrices(rates: RateStandardCollection, config: CalculationConfig): SelectedStandardPrices {
    const { topic, interpreterType, clientIsGstPayer, interpreterIsGstPayer } = config;

    const isSpecialTopic = topic === EAppointmentTopic.LEGAL || topic === EAppointmentTopic.MEDICAL;
    const isProfessionalInterpreter = interpreterType === EAppointmentInterpreterType.IND_PROFESSIONAL_INTERPRETER;
    const useSpecialPricing = isSpecialTopic && isProfessionalInterpreter;

    const standardFirst = this.extractPrices(
      rates.standardHoursFirstMinutes,
      useSpecialPricing,
      clientIsGstPayer,
      interpreterIsGstPayer,
    );
    const standardAdditional = this.extractPrices(
      rates.standardHoursAdditionalBlock,
      useSpecialPricing,
      clientIsGstPayer,
      interpreterIsGstPayer,
    );
    const afterHoursFirst = this.extractPrices(
      rates.afterHoursFirstMinutes,
      useSpecialPricing,
      clientIsGstPayer,
      interpreterIsGstPayer,
    );
    const afterHoursAdditional = this.extractPrices(
      rates.afterHoursAdditionalBlock,
      useSpecialPricing,
      clientIsGstPayer,
      interpreterIsGstPayer,
    );

    return {
      client: {
        basePriceStandardPerMinute: standardFirst.client,
        additionalPriceStandardPerMinute: standardAdditional.client,
        basePriceAfterHoursPerMinute: afterHoursFirst.client,
        additionalPriceAfterHoursPerMinute: afterHoursAdditional.client,
      },
      interpreter: {
        basePriceStandardPerMinute: standardFirst.interpreter,
        additionalPriceStandardPerMinute: standardAdditional.interpreter,
        basePriceAfterHoursPerMinute: afterHoursFirst.interpreter,
        additionalPriceAfterHoursPerMinute: afterHoursAdditional.interpreter,
      },
    };
  }

  private extractPrices(
    rate: IConvertedRate,
    useSpecialPricing: boolean,
    clientIsGstPayer: boolean,
    interpreterIsGstPayer: boolean,
  ): TExtractPrices {
    if (useSpecialPricing) {
      return {
        client: clientIsGstPayer
          ? (rate.paidByTakerSpecialWithGstPerMinute as number)
          : (rate.paidByTakerSpecialWithoutGstPerMinute as number),
        interpreter: interpreterIsGstPayer
          ? (rate.paidToInterpreterSpecialWithGstPerMinute as number)
          : (rate.paidToInterpreterSpecialWithoutGstPerMinute as number),
      };
    } else {
      return {
        client: clientIsGstPayer ? rate.paidByTakerGeneralWithGstPerMinute : rate.paidByTakerGeneralWithoutGstPerMinute,
        interpreter: interpreterIsGstPayer
          ? rate.paidToInterpreterGeneralWithGstPerMinute
          : rate.paidToInterpreterGeneralWithoutGstPerMinute,
      };
    }
  }
}
