import { IConvertedRate } from "src/modules/rates/common/interfaces";

export interface RateStandardCollection {
  readonly standardHoursFirstMinutes: IConvertedRate;
  readonly standardHoursAdditionalBlock: IConvertedRate;
  readonly afterHoursFirstMinutes: IConvertedRate;
  readonly afterHoursAdditionalBlock: IConvertedRate;
}

export interface RateFlatCollection {
  readonly standardHoursFirstMinutes: IConvertedRate;
  readonly standardHoursAdditionalBlock: undefined;
  readonly afterHoursFirstMinutes: undefined;
  readonly afterHoursAdditionalBlock: undefined;
}

export interface SelectedStandardPrices {
  readonly client: PartyStandardPrices;
  readonly interpreter: PartyStandardPrices;
}

export interface SelectedFlatRatePrices {
  readonly client: PartyFlatPrices;
  readonly interpreter: PartyFlatPrices;
}

export interface PartyStandardPrices {
  readonly basePriceStandardPerMinute: number;
  readonly additionalPriceStandardPerMinute: number;
  readonly basePriceAfterHoursPerMinute: number;
  readonly additionalPriceAfterHoursPerMinute: number;
}

export interface PartyFlatPrices {
  readonly basePriceStandardPerMinute: number;
  readonly additionalPriceStandardPerMinute: undefined;
  readonly basePriceAfterHoursPerMinute: undefined;
  readonly additionalPriceAfterHoursPerMinute: undefined;
}
