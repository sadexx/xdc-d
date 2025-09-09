import { ValuesOf } from "src/common/types";

export const EMockType = {
  REGISTRATION: "registration",
  EMAIL_VERIFY_CODE: "email-verify-code",
  SEND_PHONE_NUMBER_VERIFICATION_CODE: "send-phone-number-verification-code",
  GET_ABN_VERIFICATION_STATUS: "get-abn-verification-status",
  IELTS_VERIFICATION: "ielts-verification",
  START_WWCC: "start-wwcc",
  VERIFICATION_NAATI_CPN_NUMBER: "verification-naati-cpn-number",
  CREATE_AND_SEND_CONTRACT: "create-and-send-contract",
} as const;

export type EMockType = ValuesOf<typeof EMockType>;
