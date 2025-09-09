import { OneRoleLoginOutput } from "src/modules/auth/common/outputs";

export class FinishAccountActivationStepsOutput extends OneRoleLoginOutput {
  declare accessToken: string;

  declare refreshToken: string;

  failedActivationCriteria?: string;
}
