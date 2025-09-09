export const enum TokenStrategies {
  JWT_REQUIRED_INFO_ACCESS_STRATEGY = "jwt-required-info",
  JWT_ACTIVATION_ACCESS_STRATEGY = "jwt-activation",
  JWT_FULL_ACCESS_STRATEGY = "jwt",

  JWT_REQUIRED_INFO_REFRESH_STRATEGY = "jwt-refresh-required-info",
  JWT_ACTIVATION_REFRESH_STRATEGY = "jwt-activation-refresh",
  JWT_FULL_REFRESH_STRATEGY = "jwt-refresh",

  JWT_EMAIL_CONFIRMATION = "jwt-email-confirmation",
  JWT_REGISTRATION_STRATEGY = "jwt-registration",
  JWT_RESTORATION_STRATEGY = "jwt-restoration",
  JWT_RESET_PASSWORD_STRATEGY = "jwt-reset-password",
  JWT_ROLE_SELECTION_STRATEGY = "jwt-role-selection",
}
