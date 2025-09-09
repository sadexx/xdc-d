import { NaatiInterpreter } from "src/modules/naati/entities";
import { EExtInterpreterLevel } from "src/modules/naati/common/enum";
import { ELanguages } from "src/modules/interpreters/profile/common/enum";

export interface ICreateNaatiLanguagePair {
  naatiInterpreter: NaatiInterpreter;
  interpreterLevel: EExtInterpreterLevel;
  languageFrom: ELanguages;
  languageTo: ELanguages;
}
