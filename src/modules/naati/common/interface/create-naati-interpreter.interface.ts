import { ELanguages } from "src/modules/interpreters/profile/common/enum";
import { INaatiAddress } from "src/modules/naati/common/interface";
import { EExtNaatiInterpreterType } from "src/modules/naati/common/enum";

export interface ICreateNaatiInterpreter {
  surname: string;
  givenName: string;
  otherNames: string;
  title: string;
  mainSectionInterpreterType: EExtNaatiInterpreterType;
  mainSectionLanguage: ELanguages;
  phone: string | null;
  websiteUrl: string | null;
  email: string | null;
  address: INaatiAddress | null;
}
