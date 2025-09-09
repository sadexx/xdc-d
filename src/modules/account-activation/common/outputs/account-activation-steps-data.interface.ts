import {
  IStepInformation,
  IStepRightToWorkAsLanguageBuddyInformation,
} from "src/modules/account-activation/common/interfaces";

export interface IAccountRequiredStepsDataOutput {
  profileInformationFulfilled: IStepInformation;
  questionnaireFulfilled?: IStepInformation;
  sumSubVerificationFulfilled?: IStepInformation;
  abnVerificationFulfilled?: IStepInformation;
  docusignContractFulfilled?: IStepInformation;
  backyCheckFulfilled?: IStepInformation;
  naatiVerificationFulfilled?: IStepInformation;
  rightToWorkAsLanguageBuddy?: IStepRightToWorkAsLanguageBuddyInformation;
  customInsuranceFulfilled?: IStepInformation;
  concessionCardFulfilled?: IStepInformation;
  rightToWorkCheckFulfilled?: IStepInformation;
  paymentInformationFulfilled?: IStepInformation;
}
