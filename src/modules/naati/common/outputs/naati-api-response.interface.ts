import { EExtInterpreterLevel, EExtNaatiLanguages } from "src/modules/naati/common/enum";

export interface INaatiApiResponseOutput {
  errorCode: number;
  errorDescription?: string;
  practitioner: IPractitionerDetails;
  currentCertifications: ICertification[];
  previousCertifications: ICertification[];
}

interface IPractitionerDetails {
  practitionerId: string;
  givenName: string;
  familyName: string;
  country: string;
}

interface ICertification {
  certificationType: EExtInterpreterLevel;
  skill: string;
  language1: EExtNaatiLanguages;
  language2: EExtNaatiLanguages;
  direction: string;
  startDate: string;
  endDate: string;
}
