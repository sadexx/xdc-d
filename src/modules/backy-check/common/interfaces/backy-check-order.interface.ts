import { EExtCheckResult, EExtCheckStatus } from "src/modules/backy-check/common/enums";

export interface IBackyCheckOrder {
  CheckStatus: EExtCheckStatus;
  CheckResults: EExtCheckResult;
  CheckResultsNotes: string;
  OrderOfficerNotes: string;
}
