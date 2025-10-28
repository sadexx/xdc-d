import { EAccountActivationErrorCodes } from "src/modules/account-activation/common/enums";

export function localizeStepNames(stepNames: string[]): string[] {
  return stepNames.map((stepName) => STEP_NAME_MAP[stepName] || stepName);
}

const STEP_NAME_MAP: Record<string, EAccountActivationErrorCodes> = {
  profileInformationFulfilled: EAccountActivationErrorCodes.STEP_PROFILE_INFORMATION,
  questionnaireFulfilled: EAccountActivationErrorCodes.STEP_QUESTIONNAIRE,
  sumSubVerificationFulfilled: EAccountActivationErrorCodes.STEP_IDENTITY_VERIFICATION,
  abnVerificationFulfilled: EAccountActivationErrorCodes.STEP_ABN_VERIFICATION,
  docusignContractFulfilled: EAccountActivationErrorCodes.STEP_DOCUSIGN_VERIFICATION,
  backyCheckFulfilled: EAccountActivationErrorCodes.STEP_BACKGROUND_CHECK,
  naatiVerificationFulfilled: EAccountActivationErrorCodes.STEP_NAATI_VERIFICATION,
  rightToWorkAsLanguageBuddy: EAccountActivationErrorCodes.STEP_RIGHT_TO_WORK_LANGUAGE_BUDDY,
  customInsuranceFulfilled: EAccountActivationErrorCodes.STEP_INSURANCE_VERIFICATION,
  concessionCardFulfilled: EAccountActivationErrorCodes.STEP_CONCESSION_CARD,
  rightToWorkCheckFulfilled: EAccountActivationErrorCodes.STEP_RIGHT_TO_WORK_CHECK,
  paymentInformationFulfilled: EAccountActivationErrorCodes.STEP_PAYMENT_INFORMATION,
};
