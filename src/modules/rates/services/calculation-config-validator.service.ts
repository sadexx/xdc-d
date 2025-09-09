import { BadRequestException, Injectable } from "@nestjs/common";
import { ECalculationType } from "src/modules/rates/common/enums";
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
      throw new BadRequestException("Interpreter type is required");
    }

    if (!config.schedulingType) {
      throw new BadRequestException("Scheduling type is required");
    }

    if (!config.communicationType) {
      throw new BadRequestException("Communication type is required");
    }

    if (!config.interpretingType) {
      throw new BadRequestException("Interpreting type is required");
    }

    if (!config.topic) {
      throw new BadRequestException("Topic is required");
    }

    if (!config.duration || config.duration <= 0) {
      throw new BadRequestException("Duration must be greater than 0");
    }

    if (!config.scheduleDateTime) {
      throw new BadRequestException("Schedule date time is required");
    }

    if (config.isEscortOrSimultaneous !== UNDEFINED_VALUE) {
      throw new BadRequestException("Escort or Simultaneous should not be set in the config");
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
      throw new BadRequestException("Extra days must be undefined for appointment start price calculations");
    }

    if (config.calculationType === ECalculationType.PRELIMINARY_ESTIMATE && config.clientIsGstPayer !== true) {
      throw new BadRequestException("Client is GST payer must be true for preliminary estimate calculations");
    }

    if (config.interpreterTimezone !== UNDEFINED_VALUE) {
      throw new BadRequestException(
        "Interpreter timezone must be undefined for preliminary estimate or appointment start price calculations",
      );
    }

    if (config.clientTimezone !== UNDEFINED_VALUE) {
      throw new BadRequestException(
        "Client timezone must be undefined for preliminary estimate or appointment start price calculations",
      );
    }

    if (config.isExternalInterpreter !== UNDEFINED_VALUE) {
      throw new BadRequestException(
        "Is external interpreter must be undefined for preliminary estimate or appointment start price calculations",
      );
    }

    if (config.includeDiscounts !== false) {
      throw new BadRequestException(
        "Include discounts must be false for preliminary estimate or appointment start price calculations",
      );
    }

    if (config.discounts !== UNDEFINED_VALUE) {
      throw new BadRequestException(
        "Discounts must be undefined for preliminary estimate or appointment start price calculations",
      );
    }
  }

  private validateEndPriceOrSingleBlock(config: CalculationConfig): void {
    if (config.extraDays !== UNDEFINED_VALUE) {
      throw new BadRequestException("Extra days must be undefined for this calculation type");
    }

    if (config.isExternalInterpreter !== true && config.interpreterTimezone === UNDEFINED_VALUE) {
      throw new BadRequestException("Interpreter timezone is required for this calculation type");
    }

    if (config.clientTimezone === UNDEFINED_VALUE) {
      throw new BadRequestException("Client timezone is required for this calculation type");
    }

    if (config.isExternalInterpreter === true && config.interpreterTimezone === UNDEFINED_VALUE) {
      throw new BadRequestException("Interpreter timezone is not allowed for PSTN calculation type");
    }
  }

  private validateDetailedBreakdown(config: CalculationConfig): void {
    if (config.isExternalInterpreter === true && config.clientTimezone === UNDEFINED_VALUE) {
      throw new BadRequestException("Client timezone is required for PSTN calls");
    }

    if (
      config.isExternalInterpreter === true &&
      (config.timeCalculationMode !== UNDEFINED_VALUE || config.interpreterTimezone !== UNDEFINED_VALUE)
    ) {
      throw new BadRequestException("Time calculation mode or interpreter timezone must be undefined for PSTN calls");
    }

    if (
      config.timeCalculationMode !== UNDEFINED_VALUE &&
      (config.clientTimezone !== UNDEFINED_VALUE || config.interpreterTimezone !== UNDEFINED_VALUE)
    ) {
      throw new BadRequestException(
        "Client and interpreter time zones are not allowed when time calculation mode is specified",
      );
    }

    if (
      config.timeCalculationMode === UNDEFINED_VALUE &&
      config.isExternalInterpreter === UNDEFINED_VALUE &&
      (config.clientTimezone === UNDEFINED_VALUE || config.interpreterTimezone === UNDEFINED_VALUE)
    ) {
      throw new BadRequestException(
        "Client and interpreter time zones are required when time calculation mode is auto",
      );
    }
  }

  private validateDiscountParameters(config: CalculationConfig): void {
    if (config && config.discounts) {
      if (config.discounts.promoCampaignDiscount && config.discounts.promoCampaignDiscount < 0) {
        throw new BadRequestException("Promo campaign discount cannot be negative");
      }

      if (config.discounts.membershipDiscount && config.discounts.membershipDiscount < 0) {
        throw new BadRequestException("Membership discount cannot be negative");
      }

      if (config.discounts.membershipFreeMinutes && config.discounts.membershipFreeMinutes < 0) {
        throw new BadRequestException("Membership free minutes cannot be negative");
      }

      if (config.discounts.promoCampaignDiscountMinutes && config.discounts.promoCampaignDiscountMinutes < 0) {
        throw new BadRequestException("Promo campaign discount minutes cannot be negative");
      }
    }
  }
}
