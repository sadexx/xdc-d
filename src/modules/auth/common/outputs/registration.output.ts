import { ERegistrationStep } from "src/modules/auth/common/enums";
import { RegistrationTokenOutput } from "src/modules/auth/common/outputs";

export class RegistrationOutput extends RegistrationTokenOutput {
  registrationStep: ERegistrationStep;
}
