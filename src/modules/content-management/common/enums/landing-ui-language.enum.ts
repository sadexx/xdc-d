import { ValuesOf } from "src/common/types";

export const ELandingUiLanguage = {
  ARABIC: "Arabic (العربية)",
  SIMPLIFIED_CHINESE: "Simplified Chinese",
  TRADITIONAL_CHINESE: "Traditional Chinese",
  ENGLISH: "English",
  FRENCH: "French (français)",
  GERMAN: "German (Deutsch)",
  HINDI: "Hindi (हिन्दी)",
  JAPANESE: "Japanese (日本語)",
  KOREAN: "Korean (한국어)",
  PORTUGUESE: "Portuguese (português)",
  RUSSIAN: "Russian (русский)",
  SPANISH: "Spanish (español)",
  THAI: "Thai (ไทย)",
  UKRAINIAN: "Ukrainian (українська)",
  VIETNAMESE: "Vietnamese (tiếng Việt)",
} as const;

export type ELandingUiLanguage = ValuesOf<typeof ELandingUiLanguage>;
