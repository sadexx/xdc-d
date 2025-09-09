import { ValuesOf } from "src/common/types";

export const EExtInterpreterLevel = {
  CERTIFIED_PROVISIONAL_INTERPRETER: "Certified Provisional Interpreter",
  CERTIFIED_CONFERENCE_INTERPRETER: "Certified Conference Interpreter",
  CERTIFIED_SPECIALIST_LEGAL_INTERPRETER: "Certified Specialist Legal Interpreter",
  CERTIFIED_SPECIALIST_HEALTH_INTERPRETER: "Certified Specialist Health Interpreter",
  CERTIFIED_INTERPRETER: "Certified Interpreter",
  RECOGNISED_PRACTISING_INTERPRETER: "Recognised Practising Interpreter",
  CERTIFIED_PROVISIONAL_DEAF_INTERPRETER: "Certified Provisional Deaf Interpreter",
  RECOGNISED_PRACTISING_DEAF_INTERPRETER: "Recognised Practising Deaf Interpreter",
} as const;

export type EExtInterpreterLevel = ValuesOf<typeof EExtInterpreterLevel>;
