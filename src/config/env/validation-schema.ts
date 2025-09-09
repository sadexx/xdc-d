import { IsNotEmpty, IsNumberString, IsString, ValidateIf } from "class-validator";
import { EEnvironment } from "src/common/enums";

export class ValidationSchema {
  /**
   ** APP
   */

  @IsNumberString()
  APP_PORT: number;

  @IsString()
  @IsNotEmpty()
  APP_URL: string;

  @IsString()
  @IsNotEmpty()
  LOKI_URL: string;

  @IsString()
  @IsNotEmpty()
  BACKEND_UTILITY_NAATI_URL: string;

  @IsString()
  @IsNotEmpty()
  INTERNAL_API_KEY: string;

  @IsString()
  @IsNotEmpty()
  INTERNAL_API_SECRET: string;

  @IsString()
  @IsNotEmpty()
  SUPER_ADMIN_EMAILS: string;

  /**
   ** Environment
   */

  @IsString()
  @IsNotEmpty()
  NODE_ENV: string;

  @IsString()
  @IsNotEmpty()
  FIRST_LAUNCH: string;

  @IsString()
  @IsNotEmpty()
  SEND_LOG_TO_LOKI: string;

  @IsString()
  @IsNotEmpty()
  COOKIE_SECURE_MODE: string;

  @IsString()
  @IsNotEmpty()
  MOCK_ENABLED: string;

  @ValidateIf((obj) => (obj as Partial<ValidationSchema>).NODE_ENV === EEnvironment.STAGING)
  @IsString()
  @IsNotEmpty()
  STAGING_ALLOWED_EMAILS: string;

  /**
   ** MOCK
   */

  @IsString()
  @IsNotEmpty()
  MOCK_EMAILS: string;

  @IsString()
  @IsNotEmpty()
  MOCK_PHONES: string;

  @IsString()
  @IsNotEmpty()
  MOCK_ABN_NUMBER: string;

  @IsString()
  @IsNotEmpty()
  MOCK_IELTS_NUMBER: string;

  @IsString()
  @IsNotEmpty()
  MOCK_WWCC_NUMBER: string;

  @IsString()
  @IsNotEmpty()
  MOCK_NAATI_NUMBER: string;

  @IsString()
  @IsNotEmpty()
  MOCK_SUMSUB_FULLNAME: string;

  /**
   ** AWS
   */

  @IsString()
  @IsNotEmpty()
  AWS_ACCOUNT_ID: string;

  @IsString()
  @IsNotEmpty()
  AWS_REGION: string;

  @IsString()
  @IsNotEmpty()
  AWS_CHIME_CONTROL_REGION: string;

  @IsString()
  @IsNotEmpty()
  AWS_CHIME_MESSAGING_CONTROL_REGION: string;

  @ValidateIf((obj) => (obj as Partial<ValidationSchema>).NODE_ENV === EEnvironment.LOCAL)
  @IsString()
  @IsNotEmpty()
  AWS_ACCESS_KEY_ID: string;

  @ValidateIf((obj) => (obj as Partial<ValidationSchema>).NODE_ENV === EEnvironment.LOCAL)
  @IsString()
  @IsNotEmpty()
  AWS_SECRET_ACCESS_KEY: string;

  @IsString()
  @IsNotEmpty()
  AWS_PINPOINT_APPLICATION_ID: string;

  @IsString()
  @IsNotEmpty()
  AWS_CHIME_SIP_MEDIA_APPLICATION_ID: string;

  @IsString()
  @IsNotEmpty()
  AWS_SQS_QUEUE_URL: string;

  @IsNumberString()
  AWS_SQS_INTERVAL_TIME_MIN: number;

  @IsString()
  @IsNotEmpty()
  AWS_S3_BUCKET_NAME: string;

  @IsString()
  @IsNotEmpty()
  AWS_S3_MEDIA_BUCKET_NAME: string;

  /**
   ** PostgresSQL
   */

  @IsString()
  @IsNotEmpty()
  POSTGRES_HOST: string;

  @IsNumberString()
  POSTGRES_PORT: number;

  @IsString()
  @IsNotEmpty()
  POSTGRES_USER: string;

  @IsString()
  @IsNotEmpty()
  POSTGRES_DB: string;

  @IsString()
  @IsNotEmpty()
  POSTGRES_PASSWORD: string;

  /**
   ** Redis
   */

  @IsString()
  @IsNotEmpty()
  REDIS_HOST: string;

  @IsNumberString()
  REDIS_PORT: number;

  @IsNumberString()
  REDIS_TTL_MINUTES: number;

  /**
   ** Jwt
   */

  @IsString()
  @IsNotEmpty()
  JWT_REQUIRED_INFO_ACCESS_TOKEN_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_REQUIRED_INFO_REFRESH_TOKEN_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACTIVATION_ACCESS_TOKEN_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACTIVATION_REFRESH_TOKEN_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_TOKEN_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_TOKEN_SECRET: string;

  @IsNumberString()
  JWT_ACCESS_TOKEN_EXPIRATION_TIME: number;

  @IsNumberString()
  JWT_REFRESH_TOKEN_EXPIRATION_TIME: number;

  @IsString()
  @IsNotEmpty()
  JWT_REGISTRATION_TOKEN_SECRET: string;

  @IsNumberString()
  JWT_REGISTRATION_TOKEN_EXPIRATION_TIME: number;

  @IsString()
  @IsNotEmpty()
  JWT_RESET_PASSWORD_TOKEN_SECRET: string;

  @IsNumberString()
  JWT_RESET_PASSWORD_TOKEN_EXPIRATION_TIME: number;

  @IsString()
  @IsNotEmpty()
  JWT_ROLE_SELECTION_TOKEN_SECRET: string;

  @IsNumberString()
  JWT_ROLE_SELECTION_TOKEN_EXPIRATION_TIME: number;

  @IsString()
  @IsNotEmpty()
  JWT_EMAIL_CONFIRMATION_TOKEN_SECRET: string;

  @IsNumberString()
  JWT_EMAIL_CONFIRMATION_TOKEN_EXPIRATION_TIME: number;

  @IsNumberString()
  JWT_INVITATION_EXPIRATION_TIME: number;

  @IsString()
  @IsNotEmpty()
  JWT_RESTORE_TOKEN_SECRET: string;

  @IsNumberString()
  JWT_RESTORE_TOKEN_EXPIRATION_TIME: number;

  /**
   ** Hashing
   */

  @IsNumberString()
  BCRYPT_SALT_ROUNDS: number;

  @IsNumberString()
  ARGON2_TIME_COST: number;

  /**
   ** Redirection
   */

  @IsString()
  @IsNotEmpty()
  AUTH_REDIRECT_ORIGIN: string;

  @IsString()
  @IsNotEmpty()
  AUTH_SESSION_SECRET: string;

  /**
   ** Apple
   */

  @IsString()
  @IsNotEmpty()
  APPLE_CLIENT_ID: string;

  @IsString()
  @IsNotEmpty()
  APPLE_TEAM_ID: string;

  @IsString()
  @IsNotEmpty()
  APPLE_KEY_ID: string;

  @IsString()
  @IsNotEmpty()
  APPLE_PRIVATE_KEY: string;

  /**
   ** Google
   */

  @IsString()
  @IsNotEmpty()
  GOOGLE_OAUTH2_CLIENT_ID: string;

  @IsString()
  @IsNotEmpty()
  GOOGLE_OAUTH2_CLIENT_SECRET: string;

  /**
   ** Emails
   */

  @IsString()
  @IsNotEmpty()
  EMAIL_HOST: string;

  @IsNumberString()
  EMAIL_PORT: string;

  @IsString()
  @IsNotEmpty()
  EMAIL_AUTHOR: string;

  @IsString()
  @IsNotEmpty()
  EMAIL_AUTHOR_NAME: string;

  @IsString()
  @IsNotEmpty()
  EMAIL_USER: string;

  @IsString()
  @IsNotEmpty()
  EMAIL_PASSWORD: string;

  /**
   ** Frontend links
   */

  @IsString()
  @IsNotEmpty()
  FRONTEND_URI: string;

  @IsString()
  @IsNotEmpty()
  FRONTEND_URIS_CORS: string;

  @IsString()
  @IsNotEmpty()
  RESET_PASSWORD_PATH: string;

  @IsString()
  @IsNotEmpty()
  REGISTRATION_STEP_PASSWORD_PATH: string;

  @IsString()
  @IsNotEmpty()
  REGISTRATION_STEP_AGREEMENTS_PATH: string;

  /**
   ** Third-party APIs
   */

  /**
   ** ABN
   */

  @IsString()
  @IsNotEmpty()
  ABN_BASE_URL: string;

  @IsString()
  @IsNotEmpty()
  ABN_GUID: string;

  /**
   ** Sumsub
   */

  @IsString()
  @IsNotEmpty()
  SUMSUB_BASE_URL: string;

  @IsString()
  @IsNotEmpty()
  SUMSUB_REQUEST_PATH: string;

  @IsString()
  @IsNotEmpty()
  SUMSUB_API_TOKEN: string;

  @IsString()
  @IsNotEmpty()
  SUMSUB_API_KEY: string;

  /**
   ** DocuSign
   */

  @IsString()
  @IsNotEmpty()
  DOCUSIGN_BASE_URL: string;

  @IsString()
  @IsNotEmpty()
  DOCUSIGN_APP_BASE_URL: string;

  @IsString()
  @IsNotEmpty()
  DOCUSIGN_PRIVATE_KEY: string;

  @IsString()
  @IsNotEmpty()
  DOCUSIGN_INTEGRATION_KEY: string;

  @IsString()
  @IsNotEmpty()
  DOCUSIGN_REDIRECT_URI: string;

  @IsString()
  @IsNotEmpty()
  DOCUSIGN_USER_ID: string;

  @IsString()
  @IsNotEmpty()
  DOCUSIGN_IND_PROFESSIONAL_INTERPRETER_AUSTRALIA_TEMPLATE_ID: string;

  @IsString()
  @IsNotEmpty()
  DOCUSIGN_IND_PROFESSIONAL_INTERPRETER_DIFFERENT_COUNTRY_TEMPLATE_ID: string;

  @IsString()
  @IsNotEmpty()
  DOCUSIGN_IND_LANGUAGE_BUDDY_INTERPRETER_AUSTRALIA_TEMPLATE_ID: string;

  @IsString()
  @IsNotEmpty()
  DOCUSIGN_IND_LANGUAGE_BUDDY_INTERPRETER_DIFFERENT_COUNTRY_TEMPLATE_ID: string;

  @IsString()
  @IsNotEmpty()
  DOCUSIGN_CORPORATE_CLIENTS_SUPER_ADMIN_AUSTRALIA_TEMPLATE_ID: string;

  @IsString()
  @IsNotEmpty()
  DOCUSIGN_CORPORATE_CLIENTS_SUPER_ADMIN_DIFFERENT_COUNTRY_TEMPLATE_ID: string;

  @IsString()
  @IsNotEmpty()
  DOCUSIGN_CORPORATE_INTERPRETING_PROVIDERS_SUPER_ADMIN_AUSTRALIA_TEMPLATE_ID: string;

  @IsString()
  @IsNotEmpty()
  DOCUSIGN_CORPORATE_INTERPRETING_PROVIDERS_SUPER_ADMIN_DIFFERENT_COUNTRY_TEMPLATE_ID: string;

  @IsString()
  @IsNotEmpty()
  DOCUSIGN_CORPORATE_CLIENTS_SUPER_ADMIN_AUSTRALIA_SINGLE_TEMPLATE_ID: string;

  @IsString()
  @IsNotEmpty()
  DOCUSIGN_CORPORATE_CLIENTS_SUPER_ADMIN_DIFFERENT_COUNTRY_SINGLE_TEMPLATE_ID: string;

  @IsString()
  @IsNotEmpty()
  DOCUSIGN_CORPORATE_INTERPRETING_PROVIDERS_SUPER_ADMIN_AUSTRALIA_SINGLE_TEMPLATE_ID: string;

  @IsString()
  @IsNotEmpty()
  DOCUSIGN_CORPORATE_INTERPRETING_PROVIDERS_SUPER_ADMIN_DIFFERENT_COUNTRY_SINGLE_TEMPLATE_ID: string;

  /**
   ** BackyCheck
   */

  @IsString()
  @IsNotEmpty()
  BACKYCHECK_BASE_URL: string;

  @IsString()
  @IsNotEmpty()
  BACKYCHECK_CLIENT_ID: string;

  @IsString()
  @IsNotEmpty()
  BACKYCHECK_CLIENT_SECRET: string;

  /**
   ** IELTS
   */

  @IsString()
  @IsNotEmpty()
  IELTS_BASE_URL: string;

  @IsString()
  @IsNotEmpty()
  IELTS_CLIENT_ID: string;

  @IsString()
  @IsNotEmpty()
  IELTS_CLIENT_SECRET: string;

  @IsNumberString()
  @IsNotEmpty()
  IELTS_MIN_OVERALL_SCORE: number;

  /**
   ** Paypal
   */

  @IsString()
  @IsNotEmpty()
  PAYPAL_BASE_URL: string;

  @IsString()
  @IsNotEmpty()
  PAYPAL_CLIENT_ID: string;

  @IsString()
  @IsNotEmpty()
  PAYPAL_CLIENT_SECRET: string;

  /**
   ** Stripe
   */

  @IsString()
  @IsNotEmpty()
  STRIPE_SECRET_KEY: string;

  @IsString()
  @IsNotEmpty()
  STRIPE_PRICE_ID_BRONZE_GLOBAL: string;

  @IsString()
  @IsNotEmpty()
  STRIPE_PRICE_ID_BRONZE_AU: string;

  @IsString()
  @IsNotEmpty()
  STRIPE_PRICE_ID_SILVER_GLOBAL: string;

  @IsString()
  @IsNotEmpty()
  STRIPE_PRICE_ID_SILVER_AU: string;

  @IsString()
  @IsNotEmpty()
  STRIPE_PRICE_ID_GOLD_GLOBAL: string;

  @IsString()
  @IsNotEmpty()
  STRIPE_PRICE_ID_GOLD_AU: string;
}
