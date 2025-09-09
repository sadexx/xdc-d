import { EmailConfirmationTokenOutput } from "src/modules/auth/common/outputs";

export interface IMockRegistrationResult {
  isMocked: boolean;
  result: EmailConfirmationTokenOutput | null;
}
