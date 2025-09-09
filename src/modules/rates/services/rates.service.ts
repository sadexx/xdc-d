import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindManyOptions, FindOptionsSelect, Repository } from "typeorm";
import { isInRoles } from "src/common/utils";
import { ESortOrder } from "src/common/enums";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import {
  RATE_SELECT_ROLES_FOR_TAKER_FIELDS,
  LFH_ADMIN_ROLES,
  IND_INTERPRETER_ROLES,
  NUMBER_OF_MINUTES_IN_SIX_HOURS,
  NUMBER_OF_SECONDS_IN_MINUTE,
} from "src/common/constants";
import { RedisService } from "src/modules/redis/services";
import { IDiscountRate } from "src/modules/discounts/common/interfaces";
import { RateStepService, RateRetrieverService, RateBuilderService } from "src/modules/rates/services";
import { TAppointmentCalculation } from "src/modules/rates/common/types";
import { ECalculationType } from "src/modules/rates/common/enums";
import { AuditPriceDto, CalculatePriceDto, GetRateTableDto, UpdateRateTableDto } from "src/modules/rates/common/dto";
import { CalculationConfig, BillingSummary } from "src/modules/rates/common/interfaces";
import { differenceInMinutes } from "date-fns";
import { Rate } from "src/modules/rates/entities";
import { EAppointmentInterpreterType } from "src/modules/appointments/appointment/common/enums";
import { ICalculatePriceGetPriceOutput, IConvertedRateOutput } from "src/modules/rates/common/outputs";
import { LokiLogger } from "src/common/logger";
import { IMessageOutput } from "src/common/outputs";

@Injectable()
export class RatesService {
  private readonly lokiLogger = new LokiLogger(RatesService.name);
  public constructor(
    @InjectRepository(Rate)
    private readonly ratesRepository: Repository<Rate>,
    private readonly redisService: RedisService,
    private readonly rateBuilderService: RateBuilderService,
    private readonly rateRetrieverService: RateRetrieverService,
    private readonly rateStepService: RateStepService,
  ) {}

  public async seedRatesToDatabase(): Promise<void> {
    const ratesCount = await this.ratesRepository.count();

    if (ratesCount === 0) {
      const ON_DEMAND_AUDIO_STANDARD_FIRST_FOR_PROFESSIONAL_INTERPRETER = 28;
      const ON_DEMAND_AUDIO_STANDARD_FIRST_FOR_LANGUAGE_BUDDY = 15;

      const defaultRatesForProfessionalInterpreter = await this.generateRateTable(
        EAppointmentInterpreterType.IND_PROFESSIONAL_INTERPRETER,
        ON_DEMAND_AUDIO_STANDARD_FIRST_FOR_PROFESSIONAL_INTERPRETER,
      );

      const defaultRatesForLanguageBuddy = await this.generateRateTable(
        EAppointmentInterpreterType.IND_LANGUAGE_BUDDY_INTERPRETER,
        ON_DEMAND_AUDIO_STANDARD_FIRST_FOR_LANGUAGE_BUDDY,
      );

      const defaultRates = [...defaultRatesForProfessionalInterpreter, ...defaultRatesForLanguageBuddy];

      const rates: Rate[] = [];

      for (const rate of defaultRates) {
        const transformedRate = this.rateRetrieverService.buildFormattedRateForCreation(rate);
        rates.push(this.ratesRepository.create(transformedRate));
      }

      await this.ratesRepository.save(rates);

      this.lokiLogger.log(`Seeded Rates table, added ${rates.length} records`);
    }
  }

  public async generateRateTable(
    interpreterType: EAppointmentInterpreterType,
    onDemandAudioStandardFirst = 28,
  ): Promise<Omit<IConvertedRateOutput, "id">[]> {
    const appointmentTypes = await this.rateBuilderService.generateRateTable(
      interpreterType,
      onDemandAudioStandardFirst,
    );

    return appointmentTypes;
  }

  public async getRateTable(dto: GetRateTableDto, user: ITokenUserData): Promise<IConvertedRateOutput[]> {
    const select: FindOptionsSelect<Rate> = {
      id: true,
      quantity: true,
      interpreterType: true,
      schedulingType: true,
      communicationType: true,
      interpretingType: true,
      qualifier: true,
      details: true,
      detailsSequence: true,
      detailsTime: true,
      normalHoursStart: true,
      normalHoursEnd: true,
    };

    if (isInRoles(LFH_ADMIN_ROLES, user.role)) {
      select.paidByTakerGeneralWithGst = true;
      select.paidByTakerGeneralWithoutGst = true;
      select.paidByTakerSpecialWithGst = true;
      select.paidByTakerSpecialWithoutGst = true;
      select.paidToInterpreterGeneralWithGst = true;
      select.paidToInterpreterGeneralWithoutGst = true;
      select.paidToInterpreterSpecialWithGst = true;
      select.paidToInterpreterSpecialWithoutGst = true;
      select.lfhCommissionGeneral = true;
      select.lfhCommissionSpecial = true;
    } else if (isInRoles(RATE_SELECT_ROLES_FOR_TAKER_FIELDS, user.role)) {
      select.paidByTakerGeneralWithGst = true;
      select.paidByTakerGeneralWithoutGst = true;
      select.paidByTakerSpecialWithGst = true;
      select.paidByTakerSpecialWithoutGst = true;
    } else if (isInRoles(IND_INTERPRETER_ROLES, user.role)) {
      select.paidToInterpreterGeneralWithGst = true;
      select.paidToInterpreterGeneralWithoutGst = true;
      select.paidToInterpreterSpecialWithGst = true;
      select.paidToInterpreterSpecialWithoutGst = true;
    }

    const queryOptions: FindManyOptions<Rate> = {
      where: { interpreterType: dto.interpreterType },
      select: select,
      order: { quantity: ESortOrder.ASC },
    };

    return await this.getRates(queryOptions, dto, user);
  }

  private async getRates(
    options: FindManyOptions<Rate>,
    dto: GetRateTableDto,
    user: ITokenUserData,
  ): Promise<IConvertedRateOutput[]> {
    const CACHE_TTL = NUMBER_OF_MINUTES_IN_SIX_HOURS * NUMBER_OF_SECONDS_IN_MINUTE;
    const cacheKey = `rates:${user.role}:${dto.interpreterType}`;

    const cacheData = await this.redisService.getJson<IConvertedRateOutput[]>(cacheKey);

    if (cacheData) {
      return cacheData;
    }

    const rates = await this.ratesRepository.find(options);
    const transformedRates: IConvertedRateOutput[] = [];

    for (const rate of rates) {
      const transformedRate = this.rateRetrieverService.transformRateToOutput(rate);
      transformedRates.push(transformedRate);
    }

    await this.redisService.setJson(cacheKey, transformedRates, CACHE_TTL);

    return transformedRates;
  }

  public async updateRateTable(dto: UpdateRateTableDto): Promise<IMessageOutput> {
    const transformedRates: Partial<Rate>[] = [];

    for (const rate of dto.data) {
      const transformedRate = this.rateRetrieverService.buildFormattedRateForCreation(rate);
      transformedRates.push(transformedRate);
    }

    await this.ratesRepository.save(transformedRates);
    await this.invalidateRateCache();

    return { message: "Rate table updated successfully" };
  }

  public async calculatePreliminaryEstimate(dto: CalculatePriceDto): Promise<ICalculatePriceGetPriceOutput> {
    const config: CalculationConfig = {
      calculationType: ECalculationType.PRELIMINARY_ESTIMATE,
      includeAuditSteps: false,
      interpreterType: dto.interpreterType,
      schedulingType: dto.schedulingType,
      communicationType: dto.communicationType,
      interpretingType: dto.interpretingType,
      topic: dto.topic,
      scheduleDateTime: dto.scheduleDateTime,
      duration: dto.duration,
      acceptedOvertime: dto.acceptedOvertime,
      extraDays: dto.extraDays,
      includeDiscounts: false,
      clientIsGstPayer: true,
      interpreterIsGstPayer: true,
    };

    const result = await this.rateStepService.calculate(config);

    return { price: result.clientFullAmount };
  }

  public async calculateAppointmentStartPrice(
    appointment: TAppointmentCalculation,
    clientIsGstPayer: boolean,
    discounts?: IDiscountRate,
  ): Promise<BillingSummary> {
    const config: CalculationConfig = {
      calculationType: ECalculationType.APPOINTMENT_START_PRICE,
      includeAuditSteps: false,
      interpreterType: appointment.interpreterType,
      schedulingType: appointment.schedulingType,
      communicationType: appointment.communicationType,
      interpretingType: appointment.interpretingType,
      topic: appointment.topic,
      scheduleDateTime: appointment.scheduledStartTime,
      duration: appointment.schedulingDurationMin,
      acceptedOvertime: appointment.acceptOvertimeRates,
      includeDiscounts: !!discounts,
      discounts: discounts,
      clientIsGstPayer: clientIsGstPayer,
      interpreterIsGstPayer: true,
    };

    return await this.rateStepService.calculate(config);
  }

  public async calculateAppointmentEndPrice(
    appointment: TAppointmentCalculation,
    clientIsGstPayer: boolean,
    interpreterIsGstPayer: boolean,
    discounts?: IDiscountRate,
    isExternalInterpreter?: boolean,
  ): Promise<BillingSummary> {
    const businessStartTime = appointment.businessStartTime ?? appointment.scheduledStartTime;
    const businessDuration = differenceInMinutes(businessStartTime, appointment.schedulingDurationMin);

    const config: CalculationConfig = {
      calculationType: ECalculationType.APPOINTMENT_END_PRICE,
      includeAuditSteps: false,
      interpreterType: appointment.interpreterType,
      schedulingType: appointment.schedulingType,
      communicationType: appointment.communicationType,
      interpretingType: appointment.interpretingType,
      topic: appointment.topic,
      scheduleDateTime: businessStartTime as string,
      duration: businessDuration,
      acceptedOvertime: appointment.acceptOvertimeRates,
      interpreterTimezone: appointment.interpreterTimezone,
      clientTimezone: appointment.timezone,
      isExternalInterpreter: isExternalInterpreter,
      includeDiscounts: !!discounts,
      discounts: discounts,
      clientIsGstPayer: clientIsGstPayer,
      interpreterIsGstPayer: interpreterIsGstPayer,
    };

    return await this.rateStepService.calculate(config);
  }

  public async calculateSingleBlock(
    appointment: TAppointmentCalculation,
    businessExtensionTime: number,
    clientIsGstPayer: boolean,
    interpreterIsGstPayer: boolean,
    discounts?: IDiscountRate,
    isExternalInterpreter?: boolean,
  ): Promise<BillingSummary> {
    const businessStartTime = appointment.businessStartTime ?? appointment.scheduledStartTime;
    const config: CalculationConfig = {
      calculationType: ECalculationType.SINGLE_BLOCK,
      includeAuditSteps: false,
      interpreterType: appointment.interpreterType,
      schedulingType: appointment.schedulingType,
      communicationType: appointment.communicationType,
      interpretingType: appointment.interpretingType,
      topic: appointment.topic,
      // TODO: Add Date now ILiveAppointmentCacheData - extensionPeriodStart
      scheduleDateTime: businessStartTime as string,
      duration: businessExtensionTime,
      acceptedOvertime: appointment.acceptOvertimeRates,
      interpreterTimezone: appointment.interpreterTimezone,
      clientTimezone: appointment.timezone,
      isExternalInterpreter: isExternalInterpreter,
      includeDiscounts: !!discounts,
      discounts: discounts,
      clientIsGstPayer: clientIsGstPayer,
      interpreterIsGstPayer: interpreterIsGstPayer,
    };

    return await this.rateStepService.calculate(config);
  }

  public async calculateDetailedBreakdown(dto: AuditPriceDto): Promise<BillingSummary> {
    const config: CalculationConfig = {
      calculationType: ECalculationType.DETAILED_BREAKDOWN,
      includeAuditSteps: dto.includeAuditSteps,
      timeCalculationMode: dto.timeCalculationMode,
      interpreterType: dto.interpreterType,
      schedulingType: dto.schedulingType,
      communicationType: dto.communicationType,
      interpretingType: dto.interpretingType,
      topic: dto.topic,
      scheduleDateTime: dto.scheduledStartTime,
      duration: dto.schedulingDurationMin,
      acceptedOvertime: dto.acceptedOvertime,
      interpreterTimezone: dto.interpreterTimezone,
      clientTimezone: dto.clientTimezone,
      isExternalInterpreter: dto.isExternalInterpreter,
      includeDiscounts: !!dto.discounts,
      discounts: dto.discounts,
      clientIsGstPayer: dto.clientIsGstPayer,
      interpreterIsGstPayer: dto.interpreterIsGstPayer,
    };

    return await this.rateStepService.calculate(config);
  }

  private async invalidateRateCache(): Promise<void> {
    await this.redisService.delManyByPattern(`rates:*`);
    await this.redisService.delManyByPattern(`rates-calculation:*`);
  }
}
