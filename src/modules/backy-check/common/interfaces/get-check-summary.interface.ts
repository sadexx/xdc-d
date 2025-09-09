import { EExtBackyCheckResultResponse, EExtCheckResult, EExtCheckStatus } from "src/modules/backy-check/common/enums";

export interface IGetCheckSummary {
  response: {
    responseDetails: string;
    response: EExtBackyCheckResultResponse;
  };
  orders: IGetCheckSummaryOrder[];
}

export interface IGetCheckSummaryOrder {
  orderID: string;
  DependantID: string;
  DependantDescription: string;
  ApplicantFirstName: string;
  ApplicantMiddleName: string;
  ApplicantSurname: string;
  ApplicantDOB: string;
  ApplicationStatusDesc: string;
  OrderOfficerNotes: string;
  CheckServiceID: string;
  CheckServiceName: string;
  CheckStatus: EExtCheckStatus;
  CheckLodgeDate: string;
  CheckStartDate: string;
  CheckCompletionDate: string;
  IdentityVerified: string;
  CheckDelayReason: string;
  CheckResults: EExtCheckResult;
  CheckResultsNotes: string;
}
