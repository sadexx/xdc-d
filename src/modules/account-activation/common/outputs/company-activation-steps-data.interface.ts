import { IStepInformation } from "src/modules/account-activation/common/interfaces";

export interface ICompanyActivationStepsDataOutput {
  profileInformationFulfilled: IStepInformation;
  abnVerificationFulfilled?: IStepInformation;
  documentsFulfilled: IStepInformation;
  paymentInformationFulfilled?: IStepInformation;
  docusignContractFulfilled?: IStepInformation;
}
