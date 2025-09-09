import { ERegistrationStep } from "src/modules/auth/common/enums";

export interface ITokenData {
  accessToken?: string;
  refreshToken?: string;
  emailConfirmationToken?: string;
  registrationToken?: string;
  registrationStep?: ERegistrationStep;
  roleSelectionToken?: string;
  availableRoles?: string[];
}
