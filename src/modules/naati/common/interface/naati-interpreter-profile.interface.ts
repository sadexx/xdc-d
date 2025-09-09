import { ELanguages } from "src/modules/interpreters/profile/common/enum";
import { EExtInterpreterLevel } from "src/modules/naati/common/enum";

export interface INaatiInterpreterProfile {
  practitionerCpn: string;
  givenName: string;
  familyName: string;
  country: string;
  certifiedLanguages: INaatiCertifiedLanguages[];
}

export interface INaatiCertifiedLanguages {
  language: ELanguages;
  interpreterLevel: EExtInterpreterLevel;
}
