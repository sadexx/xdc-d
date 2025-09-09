import { ETimeCalculationMode } from "src/modules/rates/common/enums";
import { TTimeBoundary } from "src/modules/rates/common/types";

export interface TimeBoundaryResult {
  readonly type: TTimeBoundary;
  readonly client: BoundaryTimeDetails;
  readonly interpreter: BoundaryTimeDetails;
  readonly combinedScenario: CombinedScenario;
}

export interface CombinedScenario {
  readonly clientMode: ETimeCalculationMode;
  readonly interpreterMode: ETimeCalculationMode;
  readonly requiresCrossRateLogic: boolean;
}

export interface BoundaryTimeDetails {
  readonly scenario: ETimeCalculationMode;
  readonly normalHoursStart: Date;
  readonly normalHoursEnd: Date;
  readonly scheduledStart: Date;
  readonly scheduledEnd: Date;
  readonly isStartBeforeNormal: boolean;
  readonly isEndAfterNormal: boolean;
}

export interface TimeAnalysis {
  readonly scenario: ETimeCalculationMode;
  readonly isStartBeforeNormal: boolean;
  readonly isEndAfterNormal: boolean;
}
