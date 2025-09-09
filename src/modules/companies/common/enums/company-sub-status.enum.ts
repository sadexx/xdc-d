import { ValuesOf } from "src/common/types";

export const ECompanySubStatus = {
  IN_PROCESS: "in-process",
  NOT_RELEVANT_FOR_NOW: "not-relevant-for-now",
  CONTACT_IN_THE_FUTURE: "contact-in-the-future",
} as const;

export type ECompanySubStatus = ValuesOf<typeof ECompanySubStatus>;
