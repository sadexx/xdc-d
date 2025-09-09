import {
  EInterpreterCertificateType,
  EInterpreterType,
  ELanguageLevel,
  ELanguages,
} from "src/modules/interpreters/profile/common/enum";

export interface IInterpreterProfile {
  type: EInterpreterType[];
  certificateType: EInterpreterCertificateType;
  knownLanguages: ELanguages[];
  knownLevels?: ELanguageLevel[];
  audioOnDemandSetting?: boolean;
  videoOnDemandSetting?: boolean;
  faceToFaceOnDemandSetting?: boolean;
  audioPreBookedSetting?: boolean;
  videoPreBookedSetting?: boolean;
  faceToFacePreBookedSetting?: boolean;
  consecutiveLegalSetting?: boolean;
  consecutiveMedicalSetting?: boolean;
  conferenceSimultaneousSetting?: boolean;
  signLanguageSetting?: boolean;
  consecutiveGeneralSetting?: boolean;
  latitude?: number;
  longitude?: number;
}
