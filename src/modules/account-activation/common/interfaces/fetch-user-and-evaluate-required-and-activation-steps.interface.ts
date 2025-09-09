import {
  TFetchUserAndEvaluateRequiredAndActivationSteps,
  TFetchUserAndEvaluateRequiredAndActivationStepsUserRole,
} from "src/modules/account-activation/common/types";
import { IAccountRequiredStepsDataOutput } from "src/modules/account-activation/common/outputs";

export interface IFetchUserAndEvaluateRequiredAndActivationSteps {
  user: TFetchUserAndEvaluateRequiredAndActivationSteps;
  userRole: TFetchUserAndEvaluateRequiredAndActivationStepsUserRole;
  accountActivationSteps: IAccountRequiredStepsDataOutput;
}
