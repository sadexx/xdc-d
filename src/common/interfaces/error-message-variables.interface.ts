import { EPaymentOperation } from "src/modules/payments-analysis/common/enums/core";

export interface IErrorMessageVariables {
  passedSteps?: string[];
  failedSteps?: string[];
  timeLimit?: number;
  expirationDate?: string;
  maxGuests?: number;
  link?: string;
  fileSize?: number;
  language?: string;
  fields?: string;
  operation?: EPaymentOperation;
}
