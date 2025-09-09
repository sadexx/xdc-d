import { ELanguages } from "src/modules/interpreters/profile/common/enum";
import { INaatiCertifiedLanguages } from "src/modules/naati/common/interface";

export interface INaatiCertifiedLanguagesListOutput {
  primaryLanguage: ELanguages;
  certifiedLanguages: INaatiCertifiedLanguages[];
}
