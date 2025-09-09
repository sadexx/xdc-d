import { EExtInterpreterLevel, EExtNaatiContactTypes, EExtNaatiLanguages } from "src/modules/naati/common/enum";

export interface INaatiInterpretersResponse {
  success: boolean;
  data: INaatiInterpreters;
}

export interface INaatiInterpreters {
  practitioners: INaatiPractitioner[];
  total: number;
}

export interface INaatiPractitioner {
  PersonId: number;
  Surname: string;
  GivenName: string;
  OtherNames: string;
  Title: string;
  CredentialTypes: INaatiCredentialTypes[] | [];
  Address: INaatiAddress;
  ContactDetails: INaatiContactDetails[];
}

export interface INaatiCredentialTypes {
  ExternalName: EExtInterpreterLevel;
  Skill: SkillPattern;
}

export type SkillPattern = `${EExtNaatiLanguages} ${"and"} ${EExtNaatiLanguages}`;

interface INaatiAddress {
  Postcode: string;
  State: string;
  StreetDetails: string;
  Country: string;
  Suburb: string;
}

export interface INaatiContactDetails {
  Type: EExtNaatiContactTypes;
  Contact: string;
}
