import { OldIConvertedRateOutput } from "src/modules/rates-old/common/outputs";

export interface OldIRatesForCalculation {
  rateStandardHoursFirstMinutes: OldIConvertedRateOutput;
  rateStandardHoursAdditionalBlock: OldIConvertedRateOutput | null;
  rateAfterHoursFirstMinutes: OldIConvertedRateOutput | null;
  rateAfterHoursAdditionalBlock: OldIConvertedRateOutput | null;
}
