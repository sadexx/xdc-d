import { EMockType } from "src/modules/mock/common/enums";
import {
  IMockAnswerResult,
  IMockGetAbnVerificationStatusResult,
  IMockIeltsVerificationResult,
  IMockPhoneNumberSendResult,
  IMockRegistrationResult,
  IMockStartWWCCResult,
  IMockVerificationNaatiCpnNumberResult,
} from "src/modules/mock/common/outputs";
import {
  IMockCreateAndSendContract,
  IMockGetAbnVerificationStatus,
  IMockIeltsVerification,
  IMockRegistration,
  IMockSendPhoneNumberVerificationCode,
  IMockStartWWCC,
  IMockVerificationNaatiCpnNumber,
  IMockVerifyCode,
} from "src/modules/mock/common/interfaces";

/**
 ** Type
 */

export type TMockParams =
  | IMockRegistrationData
  | IMockVerifyCodeData
  | IMockSendPhoneNumberVerificationCodeData
  | IMockGetAbnVerificationStatusData
  | IMockIeltsVerificationData
  | IMockStartWWCCData
  | IMockVerificationNaatiCpnNumberData
  | IMockCreateAndSendContractData;

export type TMockResult =
  | IMockRegistrationResult
  | IMockAnswerResult
  | IMockPhoneNumberSendResult
  | IMockGetAbnVerificationStatusResult
  | IMockIeltsVerificationResult
  | IMockStartWWCCResult
  | IMockVerificationNaatiCpnNumberResult;

export type TMockTypeResultMap = {
  [EMockType.REGISTRATION]: IMockRegistrationResult;
  [EMockType.EMAIL_VERIFY_CODE]: IMockAnswerResult;
  [EMockType.SEND_PHONE_NUMBER_VERIFICATION_CODE]: IMockPhoneNumberSendResult;
  [EMockType.GET_ABN_VERIFICATION_STATUS]: IMockGetAbnVerificationStatusResult;
  [EMockType.IELTS_VERIFICATION]: IMockIeltsVerificationResult;
  [EMockType.START_WWCC]: IMockStartWWCCResult;
  [EMockType.VERIFICATION_NAATI_CPN_NUMBER]: IMockVerificationNaatiCpnNumberResult;
  [EMockType.CREATE_AND_SEND_CONTRACT]: IMockAnswerResult;
};

interface IMockRegistrationData {
  type: typeof EMockType.REGISTRATION;
  data: IMockRegistration;
}

interface IMockVerifyCodeData {
  type: typeof EMockType.EMAIL_VERIFY_CODE;
  data: IMockVerifyCode;
}

interface IMockSendPhoneNumberVerificationCodeData {
  type: typeof EMockType.SEND_PHONE_NUMBER_VERIFICATION_CODE;
  data: IMockSendPhoneNumberVerificationCode;
}

interface IMockGetAbnVerificationStatusData {
  type: typeof EMockType.GET_ABN_VERIFICATION_STATUS;
  data: IMockGetAbnVerificationStatus;
}

interface IMockIeltsVerificationData {
  type: typeof EMockType.IELTS_VERIFICATION;
  data: IMockIeltsVerification;
}

interface IMockStartWWCCData {
  type: typeof EMockType.START_WWCC;
  data: IMockStartWWCC;
}

interface IMockVerificationNaatiCpnNumberData {
  type: typeof EMockType.VERIFICATION_NAATI_CPN_NUMBER;
  data: IMockVerificationNaatiCpnNumber;
}

interface IMockCreateAndSendContractData {
  type: typeof EMockType.CREATE_AND_SEND_CONTRACT;
  data: IMockCreateAndSendContract;
}
