import { Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import {
  ICreateNaatiInterpreter,
  ICreateNaatiLanguagePair,
  INaatiAddress,
  INaatiAllLanguagesInterpretersResponse,
  INaatiCredentialTypes,
  INaatiInterpretersResponse,
  INaatiLanguages,
  INaatiPractitioner,
  INaatiWebScraperReport,
  SkillPattern,
} from "src/modules/naati/common/interface";
import {
  EExtInterpreterLevel,
  EExtNaatiContactTypes,
  EExtNaatiInterpreterType,
  EExtNaatiLanguages,
  ENaatiErrorCodes,
} from "src/modules/naati/common/enum";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NaatiInterpreter, NaatiLanguagePair } from "src/modules/naati/entities";
import { NaatiService } from "src/modules/naati/services";
import { ELanguages } from "src/modules/interpreters/profile/common/enum";
import { delay, generateCode } from "src/common/utils";
import { EmailsService } from "src/modules/emails/services";
import { NUMBER_OF_MILLISECONDS_IN_SECOND, NUMBER_OF_MILLISECONDS_IN_TEN_SECONDS } from "src/common/constants";
import { IMessageOutput } from "src/common/outputs";
import { LokiLogger } from "src/common/logger";
import { HelperService } from "src/modules/helper/services";

@Injectable()
export class NaatiWebScraperService {
  private readonly lokiLogger = new LokiLogger(NaatiWebScraperService.name);
  private readonly NONCE_URL: string = "https://www.naati.com.au/online-directory";
  private readonly BASE_URL: string = "https://www.naati.com.au/wp-admin/admin-ajax.php";
  private readonly HEADERS = {
    Accept: "application/json, text/javascript, */*; q=0.01",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Accept-Language": "en-US,en;q=0.9,ru;q=0.8",
    "Cache-Control": "no-cache",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    Origin: "https://www.naati.com.au",
    Pragma: "no-cache",
    Referer: "https://www.naati.com.au/online-directory/",
    "Sec-CH-UA": '"Not)A;Brand";v="99", "Google Chrome";v="127", "Chromium";v="127"',
    "Sec-CH-UA-Mobile": "?0",
    "Sec-CH-UA-Platform": '"macOS"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
    "X-Requested-With": "XMLHttpRequest",
  };

  private readonly pollingOrdersInterval = NUMBER_OF_MILLISECONDS_IN_SECOND;
  private readonly PAGE_LIMIT: number = 5;
  private DIRECTORY_NONCE_TOKEN: string;
  private totalLanguagesProcessed: number = 0;
  private totalProfilesProcessed: number = 0;
  private totalErrors: number = 0;

  constructor(
    @InjectRepository(NaatiInterpreter)
    private readonly naatiInterpreterRepository: Repository<NaatiInterpreter>,
    @InjectRepository(NaatiLanguagePair)
    private readonly naatiLanguagePairRepository: Repository<NaatiLanguagePair>,
    private readonly naatiService: NaatiService,
    private readonly emailsService: EmailsService,
    private readonly helperService: HelperService,
  ) {}

  private async resetStatistics(): Promise<void> {
    this.totalLanguagesProcessed = 0;
    this.totalProfilesProcessed = 0;
    this.totalErrors = 0;
  }

  public async languageCompere(
    enum1: object,
    enum2: object,
  ): Promise<{
    missingInEnum1: string[];
    missingInEnum2: string[];
  }> {
    const enum1Keys = new Set(Object.keys(enum1));
    const enum2Keys = new Set(Object.keys(enum2));

    const missingInEnum1 = Array.from(enum2Keys).filter((key) => !enum1Keys.has(key));
    const missingInEnum2 = Array.from(enum1Keys).filter((key) => !enum2Keys.has(key));

    return { missingInEnum1, missingInEnum2 };
  }

  public async updateNonceToken(): Promise<IMessageOutput> {
    try {
      const response = await fetch(this.NONCE_URL, {
        method: "GET",
        headers: this.HEADERS,
        signal: AbortSignal.timeout(NUMBER_OF_MILLISECONDS_IN_TEN_SECONDS),
      });

      if (!response.ok) {
        this.lokiLogger.error(`HTTP error! status: ${response.statusText}`);
        throw new ServiceUnavailableException(ENaatiErrorCodes.WEB_SCRAPER_HTTP_ERROR);
      }

      const html = await response.text();

      const nonceValue = await this.extractNonce(html);

      if (!nonceValue) {
        throw new NotFoundException(ENaatiErrorCodes.WEB_SCRAPER_NONCE_NOT_FOUND);
      }

      this.DIRECTORY_NONCE_TOKEN = nonceValue;
      this.lokiLogger.log(`Nonce value: ${nonceValue}`);

      return { message: "Nonce value extracted successfully" };
    } catch (error) {
      this.lokiLogger.error(`Failed to extract nonce value: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException(ENaatiErrorCodes.WEB_SCRAPER_NONCE_EXTRACTION_FAILED);
    }
  }

  private async extractNonce(html: string): Promise<string | null> {
    const nonceRegex = /<input[^>]+id="nonce"[^>]+value="([^"]*)"/;
    const match = html.match(nonceRegex);

    return match ? match[1] : null;
  }

  public async launchBackgroundFullUpdate(interpreterType: EExtNaatiInterpreterType): Promise<IMessageOutput> {
    this.lokiLogger.log(`Start updating database`);
    void this.resetStatistics();
    await this.naatiService.deleteAllProfilesByType(interpreterType);
    this.fullUpdateDatabase(interpreterType)
      .then(() => {
        const report: INaatiWebScraperReport = {
          message: `Background Naati update completed successfully.`,
          totalLanguagesProcessed: this.totalLanguagesProcessed,
          totalProfilesProcessed: this.totalProfilesProcessed,
          totalErrors: this.totalErrors,
        };
        this.lokiLogger.log(`Background Naati update completed successfully`);
        void this.sendEmailsToAdminsInBackground(report).catch((error: Error) => {
          this.lokiLogger.error(`Failed to send naati report emails to admins:`, error.stack);
        });
      })
      .catch((error: Error) => {
        const report: INaatiWebScraperReport = {
          message: `Error in Naati background update, error: ${error}`,
          totalLanguagesProcessed: this.totalLanguagesProcessed,
          totalProfilesProcessed: this.totalProfilesProcessed,
          totalErrors: this.totalErrors,
        };
        this.lokiLogger.error(`Error in Naati background update, error: ${error}`);
        void this.sendEmailsToAdminsInBackground(report).catch((error: Error) => {
          this.lokiLogger.error(`Failed to send naati report emails to admins:`, error.stack);
        });
      });

    return { message: "Background Naati update started successfully" };
  }

  private async fullUpdateDatabase(interpreterType: EExtNaatiInterpreterType): Promise<void> {
    const allLanguagesInterpreters = await this.getAllNaatiInterpreterLanguages(interpreterType);

    const filteredLanguages = allLanguagesInterpreters.data.filter((language) =>
      Object.values(EExtNaatiLanguages).includes(language.DisplayName),
    );
    this.lokiLogger.log(
      `Total languages: ${allLanguagesInterpreters.data.length}. Total filtered languages: ${filteredLanguages.length}`,
    );

    let count = filteredLanguages.length;
    for (const language of filteredLanguages) {
      this.lokiLogger.log(`Total languages: ${filteredLanguages.length}. Remaining languages: ${count}`);
      await this.getAllNaatiInterpretersByLanguage(interpreterType, language);
      this.totalLanguagesProcessed++;
      count--;
    }
  }

  public async launchBackgroundLanguageUpdate(
    interpreterType: EExtNaatiInterpreterType,
    language: EExtNaatiLanguages,
  ): Promise<{
    message: string;
  }> {
    this.lokiLogger.log(`Start updating database`);
    void this.resetStatistics();
    await this.naatiService.deleteAllProfilesByLanguage(language);
    this.updateProfilesByLanguage(interpreterType, language)
      .then(() => {
        const report: INaatiWebScraperReport = {
          message: `Background Naati update completed successfully`,
          totalLanguagesProcessed: this.totalLanguagesProcessed,
          totalProfilesProcessed: this.totalProfilesProcessed,
          totalErrors: this.totalErrors,
        };
        this.lokiLogger.log(`Background Naati update completed successfully`);
        void this.sendEmailsToAdminsInBackground(report).catch((error: Error) => {
          this.lokiLogger.error(`Failed to send naati report emails to admins:`, error.stack);
        });
      })
      .catch((error: Error) => {
        this.totalErrors++;
        const report: INaatiWebScraperReport = {
          message: `Error in Naati background update, error: ${error}`,
          totalLanguagesProcessed: this.totalLanguagesProcessed,
          totalProfilesProcessed: this.totalProfilesProcessed,
          totalErrors: this.totalErrors,
        };
        this.lokiLogger.error(`Error in Naati background update, error: ${error}`);
        void this.sendEmailsToAdminsInBackground(report).catch((error: Error) => {
          this.lokiLogger.error(`Failed to send naati report emails to admins:`, error.stack);
        });
      });

    return { message: "Background Naati update started successfully" };
  }

  private async updateProfilesByLanguage(
    interpreterType: EExtNaatiInterpreterType,
    language: EExtNaatiLanguages,
  ): Promise<void> {
    const allLanguagesInterpreters = await this.getAllNaatiInterpreterLanguages(interpreterType);
    const filteredLanguage = allLanguagesInterpreters.data.find((lang) => lang.DisplayName === language);

    if (filteredLanguage) {
      await this.getAllNaatiInterpretersByLanguage(interpreterType, filteredLanguage);
      this.totalLanguagesProcessed++;
    }
  }

  private async getAllNaatiInterpreterLanguages(
    interpreterType: EExtNaatiInterpreterType,
  ): Promise<INaatiAllLanguagesInterpretersResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append("require", interpreterType);
    queryParams.append("action", "naati_od_get_languages");
    queryParams.append("nonce", this.DIRECTORY_NONCE_TOKEN);
    queryParams.append("conference", "false");

    const response = await fetch(this.BASE_URL, {
      method: "POST",
      headers: this.HEADERS,
      body: queryParams,
      signal: AbortSignal.timeout(NUMBER_OF_MILLISECONDS_IN_TEN_SECONDS),
    });

    if (!response.ok) {
      this.lokiLogger.error(`Error from NAATI: ${response.statusText}`);
      throw new ServiceUnavailableException(ENaatiErrorCodes.WEB_SCRAPER_API_ERROR);
    }

    const naatiResponse = (await response.json()) as INaatiAllLanguagesInterpretersResponse;

    return naatiResponse;
  }

  private async getAllNaatiInterpretersByLanguage(
    interpreterType: EExtNaatiInterpreterType,
    language: INaatiLanguages,
  ): Promise<void> {
    const randomSeed = generateCode();

    const initialResult = await this.getNaatiInterpretersByLanguage(language, interpreterType, 0, randomSeed);
    const totalRecords = initialResult?.data?.total ?? 0;
    const totalPages = Math.ceil(totalRecords / this.PAGE_LIMIT);

    this.lokiLogger.log(
      `Processing language: ${language.DisplayName}. Total records: ${totalRecords}. Total pages: ${totalPages}`,
    );

    if (totalPages === 0) {
      this.lokiLogger.log(`No records found for language: ${language.DisplayName}`);

      return;
    }

    for (let page = 0; page < totalPages; page++) {
      const result = await this.getNaatiInterpretersByLanguage(language, interpreterType, page, randomSeed);
      this.lokiLogger.log(
        `Processing page: ${page + 1} out of ${totalPages}. Interpreters: ${result?.data?.practitioners?.length}.`,
      );
      this.totalProfilesProcessed += result?.data?.practitioners?.length ?? 0;

      if (!result?.data?.practitioners || result.data.practitioners.length === 0) {
        this.lokiLogger.error(`No more pages found`);
        break;
      }

      await this.createAndConstructNaatiInterpreters(interpreterType, language.DisplayName, result);

      await delay(this.pollingOrdersInterval);
    }
  }

  private async getNaatiInterpretersByLanguage(
    language: INaatiLanguages,
    interpreterType: EExtNaatiInterpreterType,
    page: number,
    randomSeed: string,
  ): Promise<INaatiInterpretersResponse | undefined> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("nonce", this.DIRECTORY_NONCE_TOKEN);
      queryParams.append("_wp_http_referer", "/online-directory/");
      queryParams.append("action", "naati_od_get_search_results");
      language.SkillIds.forEach((id) => queryParams.append("forLanguages[]", id.toString()));
      queryParams.append("randomSeed", randomSeed);
      queryParams.append("require", interpreterType);
      queryParams.append("page", page.toString());
      queryParams.append("certificationType", "0");
      queryParams.append("country", "0");
      queryParams.append("state", "0");

      const response = await fetch(this.BASE_URL, {
        method: "POST",
        headers: this.HEADERS,
        body: queryParams,
        signal: AbortSignal.timeout(NUMBER_OF_MILLISECONDS_IN_TEN_SECONDS),
      });

      if (!response.ok) {
        this.lokiLogger.error(`Error from NAATI: ${response.statusText}`);
        throw new ServiceUnavailableException(ENaatiErrorCodes.WEB_SCRAPER_API_ERROR);
      }

      const naatiResponse = (await response.json()) as INaatiInterpretersResponse;

      return naatiResponse;
    } catch (error) {
      this.lokiLogger.error(
        `Failed to extract value from language: ${language.DisplayName}. error: ${(error as Error).message}`,
        (error as Error).stack,
      );
      this.totalErrors++;
      this.lokiLogger.error(`Error from NAATI: ${(error as Error).message}`);
      throw new ServiceUnavailableException(ENaatiErrorCodes.WEB_SCRAPER_API_ERROR);
    }
  }

  private async createAndConstructNaatiInterpreters(
    interpreterType: EExtNaatiInterpreterType,
    sectionLanguage: EExtNaatiLanguages,
    dto: INaatiInterpretersResponse,
  ): Promise<void> {
    for (const interpreter of dto.data.practitioners) {
      const constructInterpreter = await this.constructNaatiInterpreters(interpreterType, sectionLanguage, interpreter);
      const savedNaatiInterpreter = await this.createNaatiProfile(constructInterpreter);

      if (interpreter.CredentialTypes && interpreter.CredentialTypes.length > 0) {
        for (const languages of interpreter.CredentialTypes) {
          if (Object.values(EExtInterpreterLevel).includes(languages.ExternalName)) {
            const constructLanguagesPair = await this.constructNaatiLanguagePair(
              interpreterType,
              languages,
              savedNaatiInterpreter,
            );

            if (constructLanguagesPair) {
              await this.createLanguagePair(constructLanguagesPair.naatiLanguagePairFirst);
              await this.createLanguagePair(constructLanguagesPair.naatiLanguagePairSecond);
            }
          }
        }
      }
    }
  }

  private async constructNaatiInterpreters(
    interpreterType: EExtNaatiInterpreterType,
    sectionLanguage: EExtNaatiLanguages,
    interpreter: INaatiPractitioner,
  ): Promise<ICreateNaatiInterpreter> {
    const definePhone =
      interpreter.ContactDetails.find((record) => record.Type === EExtNaatiContactTypes.PHONE)?.Contact.trim() ?? null;
    const defineWebsiteUrl =
      interpreter.ContactDetails.find((record) => record.Type === EExtNaatiContactTypes.WEBSITE_URL)?.Contact.trim() ??
      null;
    const defineEmail =
      interpreter.ContactDetails.find((record) => record.Type === EExtNaatiContactTypes.EMAIL)?.Contact.trim() ?? null;

    const constructAddress: INaatiAddress = {
      postcode: interpreter.Address.Postcode,
      state: interpreter.Address.State,
      streetDetails: interpreter.Address.StreetDetails,
      country: interpreter.Address.Country,
      suburb: interpreter.Address.Suburb,
    };

    const transformLanguage = await this.naatiService.translateLanguage(sectionLanguage);

    return {
      surname: interpreter.Surname,
      givenName: interpreter.GivenName,
      otherNames: interpreter.OtherNames,
      title: interpreter.Title,
      mainSectionInterpreterType: interpreterType,
      mainSectionLanguage: transformLanguage,
      phone: definePhone,
      websiteUrl: defineWebsiteUrl,
      email: defineEmail,
      address: constructAddress,
    } as ICreateNaatiInterpreter;
  }

  private async createNaatiProfile(dto: ICreateNaatiInterpreter): Promise<NaatiInterpreter> {
    const createNaatiInterpreter = this.naatiInterpreterRepository.create(dto);

    return await this.naatiInterpreterRepository.save(createNaatiInterpreter);
  }

  private async constructNaatiLanguagePair(
    interpreterType: EExtNaatiInterpreterType,
    languages: INaatiCredentialTypes,
    naatiInterpreter: NaatiInterpreter,
  ): Promise<{
    naatiLanguagePairFirst: ICreateNaatiLanguagePair;
    naatiLanguagePairSecond: ICreateNaatiLanguagePair;
  } | null> {
    const extractedLanguages = await this.extractLanguageFromInterpreterType(interpreterType, languages.Skill);

    if (extractedLanguages) {
      const { languageFrom, languageTo } = extractedLanguages;

      const naatiLanguagePairFirst: ICreateNaatiLanguagePair = {
        naatiInterpreter: naatiInterpreter,
        interpreterLevel: languages.ExternalName,
        languageFrom: languageFrom,
        languageTo: languageTo,
      };

      const naatiLanguagePairSecond: ICreateNaatiLanguagePair = {
        naatiInterpreter: naatiInterpreter,
        interpreterLevel: languages.ExternalName,
        languageFrom: languageTo,
        languageTo: languageFrom,
      };

      return { naatiLanguagePairFirst, naatiLanguagePairSecond };
    }

    return null;
  }

  private async extractLanguageFromInterpreterType(
    interpreterType: EExtNaatiInterpreterType,
    skill: SkillPattern,
  ): Promise<{
    languageFrom: ELanguages;
    languageTo: ELanguages;
  } | null> {
    if (interpreterType === EExtNaatiInterpreterType.INTERPRETER) {
      return await this.extractLanguageFromInterpreter(skill);
    } else {
      return await this.extractLanguageFromDeafInterpreter(skill as EExtNaatiLanguages);
    }
  }

  private async extractLanguageFromInterpreter(skill: SkillPattern): Promise<{
    languageFrom: ELanguages;
    languageTo: ELanguages;
  } | null> {
    const twoLanguages = 2;
    let parts: string[] = [];
    parts = skill.trim().split(" and ");

    if (parts.length !== twoLanguages) {
      parts = skill.trim().split(" to ");
    }

    if (parts.length === twoLanguages) {
      const [languageFrom, languageTo] = parts;

      if (
        !Object.values(EExtNaatiLanguages).includes(languageFrom as EExtNaatiLanguages) ||
        !Object.values(EExtNaatiLanguages).includes(languageTo as EExtNaatiLanguages)
      ) {
        this.lokiLogger.error(`The language pair ${skill} is not supported. Please contact support.`);
        this.totalErrors++;

        return null;
      }

      const transformLanguageFrom = await this.naatiService.translateLanguage(languageFrom as EExtNaatiLanguages);
      const transformLanguageTo = await this.naatiService.translateLanguage(languageTo as EExtNaatiLanguages);

      return {
        languageFrom: transformLanguageFrom,
        languageTo: transformLanguageTo,
      };
    }

    this.lokiLogger.error(`The language pair ${skill} is not supported. Please contact support.`);
    this.totalErrors++;

    return null;
  }

  private async extractLanguageFromDeafInterpreter(skill: EExtNaatiLanguages): Promise<{
    languageFrom: ELanguages;
    languageTo: ELanguages;
  } | null> {
    skill = skill.trim() as EExtNaatiLanguages;

    if (Object.values(EExtNaatiLanguages).includes(skill)) {
      const transformLanguageFrom = await this.naatiService.translateLanguage(skill);

      const transformLanguageTo = ELanguages.ENGLISH;

      return {
        languageFrom: transformLanguageFrom,
        languageTo: transformLanguageTo,
      };
    }

    this.lokiLogger.error(`The language pair ${skill} is not supported. Please contact support.`);
    this.totalErrors++;

    return null;
  }

  private async createLanguagePair(dto: ICreateNaatiLanguagePair): Promise<NaatiLanguagePair> {
    const createNaatiLanguagePair = this.naatiLanguagePairRepository.create(dto);

    return await this.naatiLanguagePairRepository.save(createNaatiLanguagePair);
  }

  private async sendEmailsToAdminsInBackground(report: INaatiWebScraperReport): Promise<void> {
    const superAdmins = await this.helperService.getSuperAdmin();

    for (const superAdmin of superAdmins) {
      await this.emailsService.sendNaatiWebScraperNotifyToAdmin(superAdmin.email, report);
    }
  }
}
