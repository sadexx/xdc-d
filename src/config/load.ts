/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import * as process from "process";
import { IRedisConnectionData } from "src/modules/redis/common/interfaces";
import { envStringToBoolean } from "src/common/utils";
import { SMTP_SECURE_PORT } from "src/common/constants";

export const loadEnv = () => {
  const googleGeneralStrategy = {
    clientID: process.env.GOOGLE_OAUTH2_CLIENT_ID,
    clientSecret: process.env.GOOGLE_OAUTH2_CLIENT_SECRET,
    scope: ["profile", "email"],
    passReqToCallback: true,
  };

  const appleGeneralStrategy = {
    clientID: process.env.APPLE_CLIENT_ID,
    teamID: process.env.APPLE_TEAM_ID,
    keyID: process.env.APPLE_KEY_ID,
    key: process.env.APPLE_PRIVATE_KEY,
    scope: ["email", "name"],
    passReqToCallback: true,
  };

  const facebookGeneralStrategy = {
    clientID: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    scope: "email",
    profileFields: ["emails", "name"],
    passReqToCallback: true,
  };

  return {
    appPort: parseInt(process.env.APP_PORT!),
    appUrl: process.env.APP_URL,
    lokiUrl: process.env.LOKI_URL,
    backEndUtilityNaatiUrl: process.env.BACKEND_UTILITY_NAATI_URL,
    internalApiKey: process.env.INTERNAL_API_KEY,
    internalApiSecret: process.env.INTERNAL_API_SECRET,
    superAdminAllowedEmails: process.env.SUPER_ADMIN_EMAILS!.split(", "),
    environment: process.env.NODE_ENV,
    firstLaunch: envStringToBoolean(process.env.FIRST_LAUNCH!),
    sendLogToLoki: envStringToBoolean(process.env.SEND_LOG_TO_LOKI!),
    cookieSecureMode: envStringToBoolean(process.env.COOKIE_SECURE_MODE!),
    mockEnabled: envStringToBoolean(process.env.MOCK_ENABLED!),
    staging: {
      allowedEmails: process.env.STAGING_ALLOWED_EMAILS?.split(", ") || [],
    },
    mock: {
      emails: process.env.MOCK_EMAILS!.split(", "),
      phones: process.env.MOCK_PHONES!.split(", "),
      abnNumber: process.env.MOCK_ABN_NUMBER,
      ieltsNumber: process.env.MOCK_IELTS_NUMBER,
      wwccNumber: process.env.MOCK_WWCC_NUMBER,
      naatiNumber: process.env.MOCK_NAATI_NUMBER,
      sumSubFullName: process.env.MOCK_SUMSUB_FULLNAME,
    },
    aws: {
      awsAccountId: process.env.AWS_ACCOUNT_ID,
      region: process.env.AWS_REGION,
      chimeControlRegion: process.env.AWS_CHIME_CONTROL_REGION,
      chimeMessagingControlRegion: process.env.AWS_CHIME_MESSAGING_CONTROL_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
      pinpointApplicationId: process.env.AWS_PINPOINT_APPLICATION_ID,
      sipMediaApplicationId: process.env.AWS_CHIME_SIP_MEDIA_APPLICATION_ID,
      sqsQueueUrl: process.env.AWS_SQS_QUEUE_URL,
      intervalTimeMinutes: parseInt(process.env.AWS_SQS_INTERVAL_TIME_MIN!),
      s3BucketName: process.env.AWS_S3_BUCKET_NAME,
      s3MediaBucketName: process.env.AWS_S3_MEDIA_BUCKET_NAME,
    },
    db: {
      type: "postgres",
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.POSTGRES_PORT!),
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
    },
    redis: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT!),
      ttlMinutes: Number(process.env.REDIS_TTL_MINUTES),
    } as IRedisConnectionData,
    jwt: {
      access: {
        expirationTimeSeconds: parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRATION_TIME!),
      },
      refresh: {
        expirationTimeSeconds: parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRATION_TIME!),
      },
      registration: {
        expirationTimeSeconds: parseInt(process.env.JWT_REGISTRATION_TOKEN_EXPIRATION_TIME!),
      },
      roleSelection: {
        expirationTimeSeconds: parseInt(process.env.JWT_ROLE_SELECTION_TOKEN_EXPIRATION_TIME!),
      },
      resetPassword: {
        expirationTimeSeconds: parseInt(process.env.JWT_RESET_PASSWORD_TOKEN_EXPIRATION_TIME!),
      },
      invitation: {
        expirationTimeSeconds: parseInt(process.env.JWT_INVITATION_EXPIRATION_TIME!),
      },
      restore: {
        expirationTimeSeconds: parseInt(process.env.JWT_RESTORE_TOKEN_EXPIRATION_TIME!),
      },
    },
    hashing: {
      bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS!),
      argon2TimeCost: parseInt(process.env.ARGON2_TIME_COST!),
    },
    mailerSettings: {
      transport: {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: Number(process.env.EMAIL_PORT) === SMTP_SECURE_PORT,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      },
      defaults: {
        from: `"${process.env.EMAIL_AUTHOR_NAME}" <${process.env.EMAIL_AUTHOR}>`,
      },
    },
    googleAuth: {
      ...googleGeneralStrategy,
      callbackURL: `${process.env.AUTH_REDIRECT_ORIGIN}/auth/google-redirect`,
    },
    appleAuth: {
      ...appleGeneralStrategy,
      callbackURL: `${process.env.AUTH_REDIRECT_ORIGIN}/auth/apple-redirect`,
    },
    facebook: {
      ...facebookGeneralStrategy,
      callbackURL: `${process.env.AUTH_REDIRECT_ORIGIN}/auth/facebook-redirect`,
    },
    frontend: {
      uri: process.env.FRONTEND_URI,
      frontendUrisCors: process.env.FRONTEND_URIS_CORS,
      resetPasswordRedirectionLink: `${process.env.FRONTEND_URI}/${process.env.RESET_PASSWORD_PATH}`,
      registrationStepPasswordLink: `${process.env.FRONTEND_URI}/${process.env.REGISTRATION_STEP_PASSWORD_PATH}`,
      superAdminRedirectLink: `${process.env.FRONTEND_URI}/signup/step/password`,
      restorationRedirectionLink: `${process.env.FRONTEND_URI}/account-restoration`,
      registrationStepAgreementsLink: `${process.env.FRONTEND_URI}/${process.env.REGISTRATION_STEP_AGREEMENTS_PATH}`,
    },
    abn: {
      baseUrl: process.env.ABN_BASE_URL,
      guid: process.env.ABN_GUID,
    },
    sumsub: {
      baseUrl: process.env.SUMSUB_BASE_URL,
      requestPath: process.env.SUMSUB_REQUEST_PATH,
      apiToken: process.env.SUMSUB_API_TOKEN,
      apiKey: process.env.SUMSUB_API_KEY,
    },
    docusign: {
      integrationKey: process.env.DOCUSIGN_INTEGRATION_KEY,
      redirectURI: process.env.DOCUSIGN_REDIRECT_URI,
      userId: process.env.DOCUSIGN_USER_ID,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      privateKey: JSON.parse(process.env.DOCUSIGN_PRIVATE_KEY || "{}").privateKey,
      baseUrl: process.env.DOCUSIGN_BASE_URL,
      appBaseUrl: process.env.DOCUSIGN_APP_BASE_URL,
      individualTemplateId: process.env.DOCUSIGN_INDIVIDUAL_TEMPLATE_ID,
      corporateTemplateId: process.env.DOCUSIGN_CORPORATE_TEMPLATE_ID,
      indProfessionalInterpreterAustraliaTemplateId:
        process.env.DOCUSIGN_IND_PROFESSIONAL_INTERPRETER_AUSTRALIA_TEMPLATE_ID,
      indProfessionalInterpreterDifferentCountryTemplateId:
        process.env.DOCUSIGN_IND_PROFESSIONAL_INTERPRETER_DIFFERENT_COUNTRY_TEMPLATE_ID,
      indLanguageBuddyAustraliaTemplateId: process.env.DOCUSIGN_IND_LANGUAGE_BUDDY_INTERPRETER_AUSTRALIA_TEMPLATE_ID,
      indLanguageBuddyDifferentCountryTemplateId:
        process.env.DOCUSIGN_IND_LANGUAGE_BUDDY_INTERPRETER_DIFFERENT_COUNTRY_TEMPLATE_ID,
      corporateClientsSuperAdminAustraliaTemplateId:
        process.env.DOCUSIGN_CORPORATE_CLIENTS_SUPER_ADMIN_AUSTRALIA_TEMPLATE_ID,
      corporateClientsSuperAdminDifferentCountryTemplateId:
        process.env.DOCUSIGN_CORPORATE_CLIENTS_SUPER_ADMIN_DIFFERENT_COUNTRY_TEMPLATE_ID,
      corporateInterpretingProvidersSuperAdminAustraliaTemplateId:
        process.env.DOCUSIGN_CORPORATE_INTERPRETING_PROVIDERS_SUPER_ADMIN_AUSTRALIA_TEMPLATE_ID,
      corporateInterpretingProvidersSuperAdminDifferentCountryTemplateId:
        process.env.DOCUSIGN_CORPORATE_INTERPRETING_PROVIDERS_SUPER_ADMIN_DIFFERENT_COUNTRY_TEMPLATE_ID,
      corporateClientsSuperAdminAustraliaSingleTemplateId:
        process.env.DOCUSIGN_CORPORATE_CLIENTS_SUPER_ADMIN_AUSTRALIA_SINGLE_TEMPLATE_ID,
      corporateClientsSuperAdminDifferentCountrySingleTemplateId:
        process.env.DOCUSIGN_CORPORATE_CLIENTS_SUPER_ADMIN_DIFFERENT_COUNTRY_SINGLE_TEMPLATE_ID,
      corporateInterpretingProvidersSuperAdminAustraliaSingleTemplateId:
        process.env.DOCUSIGN_CORPORATE_INTERPRETING_PROVIDERS_SUPER_ADMIN_AUSTRALIA_SINGLE_TEMPLATE_ID,
      corporateInterpretingProvidersSuperAdminDifferentCountrySingleTemplateId:
        process.env.DOCUSIGN_CORPORATE_INTERPRETING_PROVIDERS_SUPER_ADMIN_DIFFERENT_COUNTRY_SINGLE_TEMPLATE_ID,
    },
    ielts: {
      baseUrl: process.env.IELTS_BASE_URL,
      clientId: process.env.IELTS_CLIENT_ID,
      clientSecret: process.env.IELTS_CLIENT_SECRET,
      minOverallScore: process.env.IELTS_MIN_OVERALL_SCORE,
    },
    backyCheck: {
      baseUrl: process.env.BACKYCHECK_BASE_URL,
      clientId: process.env.BACKYCHECK_CLIENT_ID,
      clientSecret: process.env.BACKYCHECK_CLIENT_SECRET,
    },
    paypal: {
      baseUrl: process.env.PAYPAL_BASE_URL,
      clientId: process.env.PAYPAL_CLIENT_ID,
      clientSecret: process.env.PAYPAL_CLIENT_SECRET,
    },
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
      priceIdBronzeGlobal: process.env.STRIPE_PRICE_ID_BRONZE_GLOBAL,
      priceIdBronzeAu: process.env.STRIPE_PRICE_ID_BRONZE_AU,
      priceIdSilverGlobal: process.env.STRIPE_PRICE_ID_SILVER_GLOBAL,
      priceIdSilverAu: process.env.STRIPE_PRICE_ID_SILVER_AU,
      priceIdGoldGlobal: process.env.STRIPE_PRICE_ID_GOLD_GLOBAL,
      priceIdGoldAu: process.env.STRIPE_PRICE_ID_GOLD_AU,
    },
  };
};
