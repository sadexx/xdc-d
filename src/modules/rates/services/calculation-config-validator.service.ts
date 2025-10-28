import { BadRequestException, Injectable } from "@nestjs/common";
import { ECalculationType, ERatesErrorCodes } from "src/modules/rates/common/enums";
import { CalculationConfig } from "src/modules/rates/common/interfaces";
import { UNDEFINED_VALUE } from "src/common/constants";

@Injectable()
export class CalculationConfigValidatorService {
  validate(config: CalculationConfig): void {
    this.validateBasicParameters(config);
    this.validateCalculationType(config);
    this.validateDiscountParameters(config);
  }

  private validateBasicParameters(config: CalculationConfig): void {
    if (!config.interpreterType) {
      throw new BadRequestException(ERatesErrorCodes.INTERPRETER_TYPE_REQUIRED);
    }

    if (!config.schedulingType) {
      throw new BadRequestException(ERatesErrorCodes.SCHEDULING_TYPE_REQUIRED);
    }

    if (!config.communicationType) {
      throw new BadRequestException(ERatesErrorCodes.COMMUNICATION_TYPE_REQUIRED);
    }

    if (!config.interpretingType) {
      throw new BadRequestException(ERatesErrorCodes.INTERPRETING_TYPE_REQUIRED);
    }

    if (!config.topic) {
      throw new BadRequestException(ERatesErrorCodes.TOPIC_REQUIRED);
    }

    if (!config.duration || config.duration <= 0) {
      throw new BadRequestException(ERatesErrorCodes.DURATION_INVALID);
    }

    if (!config.scheduleDateTime) {
      throw new BadRequestException(ERatesErrorCodes.SCHEDULE_DATETIME_REQUIRED);
    }

    if (config.isEscortOrSimultaneous !== UNDEFINED_VALUE) {
      throw new BadRequestException(ERatesErrorCodes.ESCORT_SIMULTANEOUS_NOT_ALLOWED);
    }
  }

  private validateCalculationType(config: CalculationConfig): void {
    if (
      config.calculationType === ECalculationType.PRELIMINARY_ESTIMATE ||
      config.calculationType === ECalculationType.APPOINTMENT_START_PRICE
    ) {
      this.validatePreliminaryOrStartPrice(config);
    } else if (
      config.calculationType === ECalculationType.APPOINTMENT_END_PRICE ||
      config.calculationType === ECalculationType.SINGLE_BLOCK
    ) {
      this.validateEndPriceOrSingleBlock(config);
    } else {
      this.validateDetailedBreakdown(config);
    }
  }

  private validatePreliminaryOrStartPrice(config: CalculationConfig): void {
    if (config.calculationType === ECalculationType.APPOINTMENT_START_PRICE && config.extraDays !== UNDEFINED_VALUE) {
      throw new BadRequestException(ERatesErrorCodes.EXTRA_DAYS_NOT_ALLOWED_START_PRICE);
    }

    if (config.calculationType === ECalculationType.PRELIMINARY_ESTIMATE && config.clientIsGstPayer !== true) {
      throw new BadRequestException(ERatesErrorCodes.CLIENT_GST_PAYER_REQUIRED_PRELIMINARY);
    }

    if (config.interpreterTimezone !== UNDEFINED_VALUE) {
      throw new BadRequestException(ERatesErrorCodes.INTERPRETER_TIMEZONE_NOT_ALLOWED_PRELIMINARY);
    }

    if (config.clientTimezone !== UNDEFINED_VALUE) {
      throw new BadRequestException(ERatesErrorCodes.CLIENT_TIMEZONE_NOT_ALLOWED_PRELIMINARY);
    }

    if (config.isExternalInterpreter !== UNDEFINED_VALUE) {
      throw new BadRequestException(ERatesErrorCodes.EXTERNAL_INTERPRETER_NOT_ALLOWED_PRELIMINARY);
    }

    if (config.includeDiscounts !== false) {
      throw new BadRequestException(ERatesErrorCodes.DISCOUNTS_NOT_ALLOWED_PRELIMINARY);
    }

    if (config.discounts !== UNDEFINED_VALUE) {
      throw new BadRequestException(ERatesErrorCodes.DISCOUNTS_MUST_BE_UNDEFINED_PRELIMINARY);
    }
  }

  private validateEndPriceOrSingleBlock(config: CalculationConfig): void {
    if (config.extraDays !== UNDEFINED_VALUE) {
      throw new BadRequestException(ERatesErrorCodes.EXTRA_DAYS_NOT_ALLOWED);
    }

    if (config.isExternalInterpreter !== true && config.interpreterTimezone === UNDEFINED_VALUE) {
      throw new BadRequestException(ERatesErrorCodes.INTERPRETER_TIMEZONE_REQUIRED);
    }

    if (config.clientTimezone === UNDEFINED_VALUE) {
      throw new BadRequestException(ERatesErrorCodes.CLIENT_TIMEZONE_REQUIRED);
    }

    if (config.isExternalInterpreter === true && config.interpreterTimezone === UNDEFINED_VALUE) {
      throw new BadRequestException(ERatesErrorCodes.INTERPRETER_TIMEZONE_NOT_ALLOWED_PSTN);
    }
  }

  private validateDetailedBreakdown(config: CalculationConfig): void {
    if (config.isExternalInterpreter === true && config.clientTimezone === UNDEFINED_VALUE) {
      throw new BadRequestException(ERatesErrorCodes.CLIENT_TIMEZONE_REQUIRED_PSTN);
    }

    if (
      config.isExternalInterpreter === true &&
      (config.timeCalculationMode !== UNDEFINED_VALUE || config.interpreterTimezone !== UNDEFINED_VALUE)
    ) {
      throw new BadRequestException(ERatesErrorCodes.TIME_MODE_TIMEZONE_NOT_ALLOWED);
    }

    if (
      config.timeCalculationMode !== UNDEFINED_VALUE &&
      (config.clientTimezone !== UNDEFINED_VALUE || config.interpreterTimezone !== UNDEFINED_VALUE)
    ) {
      throw new BadRequestException(ERatesErrorCodes.TIMEZONES_NOT_ALLOWED_WITH_TIME_MODE);
    }

    if (
      config.timeCalculationMode === UNDEFINED_VALUE &&
      config.isExternalInterpreter === UNDEFINED_VALUE &&
      (config.clientTimezone === UNDEFINED_VALUE || config.interpreterTimezone === UNDEFINED_VALUE)
    ) {
      throw new BadRequestException(ERatesErrorCodes.TIMEZONES_REQUIRED_AUTO_MODE);
    }
  }

  private validateDiscountParameters(config: CalculationConfig): void {
    if (config && config.discounts) {
      if (config.discounts.promoCampaignDiscount && config.discounts.promoCampaignDiscount < 0) {
        throw new BadRequestException(ERatesErrorCodes.PROMO_DISCOUNT_NEGATIVE);
      }

      if (config.discounts.membershipDiscount && config.discounts.membershipDiscount < 0) {
        throw new BadRequestException(ERatesErrorCodes.MEMBERSHIP_DISCOUNT_NEGATIVE);
      }

      if (config.discounts.membershipFreeMinutes && config.discounts.membershipFreeMinutes < 0) {
        throw new BadRequestException(ERatesErrorCodes.MEMBERSHIP_FREE_MINUTES_NEGATIVE);
      }

      if (config.discounts.promoCampaignDiscountMinutes && config.discounts.promoCampaignDiscountMinutes < 0) {
        throw new BadRequestException(ERatesErrorCodes.PROMO_DISCOUNT_MINUTES_NEGATIVE);
      }
    }
  }
}
