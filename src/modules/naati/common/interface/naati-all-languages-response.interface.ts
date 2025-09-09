import { EExtNaatiLanguages } from "src/modules/naati/common/enum";

export interface INaatiAllLanguagesInterpretersResponse {
  success: boolean;
  data: INaatiLanguages[];
}

export interface INaatiLanguages {
  DisplayName: EExtNaatiLanguages;
  SkillIds: number[];
}
