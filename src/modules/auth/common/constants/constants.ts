import { ERegistrationStep, EThirdPartyAuthProvider } from "src/modules/auth/common/enums";
import { IThirdPartyAuthProviderConfig } from "src/modules/auth/common/interfaces";

export const REGISTRATION_TOKEN_QUERY_PARAM = "registration_token";
export const RESTORATION_TOKEN_QUERY_PARAM = "restoration_token";
export const USER_ID_QUERY_PARAM = "userId";
export const ROLE_QUERY_PARAM = "role";
export const RESTORATION_KEY_QUERY_PARAM = "restoration_key";
export const RESTORATION_TYPE = "type";

export const frontendRegistrationStepRoutes: Record<ERegistrationStep, string> = {
  [ERegistrationStep.PHONE_VERIFICATION]: "/signup/step/phone",
  [ERegistrationStep.TERMS_AND_CONDITIONS_ACCEPTANCE]: "/signup/agreements",
  [ERegistrationStep.FINISH_REGISTRATION]: "/signup/step/finish-registration",
};

export const thirdPartyAuthProviderConfig: Record<EThirdPartyAuthProvider, IThirdPartyAuthProviderConfig> = {
  [EThirdPartyAuthProvider.GOOGLE]: {
    authURL: "https://accounts.google.com/o/oauth2/v2/auth",
    responseType: "code",
    scope: "email profile",
  },
  [EThirdPartyAuthProvider.APPLE]: {
    authURL: "https://appleid.apple.com/auth/authorize",
    responseType: "code id_token",
    responseMode: "form_post",
    scope: "email name",
  },
};
