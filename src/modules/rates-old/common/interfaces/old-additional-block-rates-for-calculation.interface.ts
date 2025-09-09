import { OldIConvertedRateOutput } from "src/modules/rates-old/common/outputs";

export interface OldIAdditionalBlockRatesForCalculation {
  rateStandardHoursAdditionalBlock: OldIConvertedRateOutput | null;
  rateAfterHoursAdditionalBlock: OldIConvertedRateOutput | null;
}
