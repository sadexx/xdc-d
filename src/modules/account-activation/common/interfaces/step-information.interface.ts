import { EStepStatus } from "src/modules/account-activation/common/enums";

export interface IStepInformation {
  index: number;
  status: EStepStatus;
  canSkip: boolean;
  isBlockAccountActivation: boolean;
}

export interface IStepRightToWorkAsLanguageBuddyInformation extends IStepInformation {
  ieltsCheckFulfilled?: {
    status: EStepStatus;
  };
  languageDocCheckFulfilled?: {
    status: EStepStatus;
  };
}
