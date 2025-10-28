import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, ILike, Repository } from "typeorm";
import { GetAllInterpretersDto, NaatiCpnQueryDto } from "src/modules/naati/common/dto";
import { NaatiInterpreter, NaatiProfile } from "src/modules/naati/entities";
import {
  EExtInterpreterLevel,
  EExtNaatiInterpreterType,
  EExtNaatiLanguages,
  ENaatiErrorCodes,
} from "src/modules/naati/common/enum";
import { INaatiCertifiedLanguages, INaatiInterpreterProfile } from "src/modules/naati/common/interface";
import {
  EInterpreterCertificateType,
  EInterpreterType,
  ELanguageLevel,
  ELanguages,
} from "src/modules/interpreters/profile/common/enum";
import { InterpreterProfileService } from "src/modules/interpreters/profile/services";
import { IInterpreterProfile } from "src/modules/interpreters/profile/common/interface";
import { MockService } from "src/modules/mock/services";
import { ActivationTrackingService } from "src/modules/activation-tracking/services";
import {
  GetAllInterpretersOutput,
  INaatiApiResponseOutput,
  INaatiCertifiedLanguagesListOutput,
} from "src/modules/naati/common/outputs";
import { MOCK_ENABLED, REGEXP_SYMBOLS } from "src/common/constants";
import { OptionalUUIDParamDto } from "src/common/dto";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { IMessageOutput } from "src/common/outputs";
import { LokiLogger } from "src/common/logger";
import { HttpRequestService } from "src/modules/http-client/services";
import { NaatiQueryOptionsService } from "src/modules/naati/services";
import { TUserInInternalNaatiDatabase, TVerificationNaatiCpnNumber } from "src/modules/naati/common/types";
import { AccessControlService } from "src/modules/access-control/services";
import { UserRole } from "src/modules/users/entities";
import { findOneOrFailTyped } from "src/common/utils";
import { EMockType } from "src/modules/mock/common/enums";

@Injectable()
export class NaatiService {
  private readonly lokiLogger = new LokiLogger(NaatiService.name);
  constructor(
    @InjectRepository(NaatiInterpreter)
    private readonly naatiInterpreterRepository: Repository<NaatiInterpreter>,
    @InjectRepository(NaatiProfile)
    private readonly naatiProfileRepository: Repository<NaatiProfile>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly interpreterProfileService: InterpreterProfileService,
    private readonly mockService: MockService,
    private readonly activationTrackingService: ActivationTrackingService,
    private readonly httpRequestService: HttpRequestService,
    private readonly naatiQueryService: NaatiQueryOptionsService,
    private readonly accessControlService: AccessControlService,
  ) {}

  public async findCurrentUserInInternalDatabase(user: ITokenUserData): Promise<INaatiCertifiedLanguagesListOutput> {
    const queryOptions = this.naatiQueryService.getUserInInternalNaatiDatabaseOptions(user);
    const userRole = await findOneOrFailTyped<TUserInInternalNaatiDatabase>(
      user.userRoleId,
      this.userRoleRepository,
      queryOptions,
    );

    if (userRole.isActive) {
      throw new BadRequestException(ENaatiErrorCodes.VERIFICATION_INVALID_USER_STATUS);
    }

    const existingInterpreter = await this.findInterpreterInDatabase(
      userRole.profile.firstName,
      userRole.profile.lastName,
    );

    if (!existingInterpreter) {
      throw new NotFoundException(ENaatiErrorCodes.VERIFICATION_INTERPRETER_NOT_FOUND);
    }

    await this.createOrUpdateNaatiProfile(userRole, existingInterpreter);
    await this.createOrUpdateInterpreterProfile(userRole, existingInterpreter);

    this.activationTrackingService.checkActivationStepsEnded(userRole).catch((error: Error) => {
      this.lokiLogger.error(`checkActivationStepsEnded error, userRoleId: ${userRole.id}`, error.stack);
    });

    const certifiedLanguagesList: INaatiCertifiedLanguagesListOutput = {
      primaryLanguage: ELanguages.ENGLISH,
      certifiedLanguages: existingInterpreter.certifiedLanguages,
    };

    return certifiedLanguagesList;
  }

  private async findInterpreterInDatabase(
    firstName: string,
    lastName: string,
  ): Promise<INaatiInterpreterProfile | null> {
    const existingInterpreter = await this.naatiInterpreterRepository.findOne({
      where: {
        givenName: ILike(firstName),
        surname: ILike(lastName),
      },
      relations: { languagePairs: true },
    });

    if (!existingInterpreter) {
      return null;
    }

    const certifiedLanguagesMap = new Map<string, INaatiCertifiedLanguages>();

    for (const pair of existingInterpreter.languagePairs) {
      if (pair.languageFrom !== ELanguages.ENGLISH) {
        const key = `${pair.languageFrom}-${pair.interpreterLevel}`;

        certifiedLanguagesMap.set(key, {
          language: pair.languageFrom as ELanguages,
          interpreterLevel: pair.interpreterLevel,
        });
      }

      if (pair.languageTo !== ELanguages.ENGLISH) {
        const key = `${pair.languageTo}-${pair.interpreterLevel}`;
        certifiedLanguagesMap.set(key, {
          language: pair.languageTo as ELanguages,
          interpreterLevel: pair.interpreterLevel,
        });
      }
    }

    const practitioner: INaatiInterpreterProfile = {
      practitionerCpn: "unknown-internal",
      givenName: existingInterpreter.givenName ?? firstName,
      familyName: existingInterpreter.surname ?? lastName,
      country: existingInterpreter.address?.country ?? "unknown-internal",
      certifiedLanguages: Array.from(certifiedLanguagesMap.values()),
    };

    return practitioner;
  }

  public async saveCpnNaatiInfo(user: ITokenUserData, dto: NaatiCpnQueryDto): Promise<IMessageOutput> {
    const isAdminOperation = this.accessControlService.checkAdminRoleForOperation(dto, user);
    const whereConditions: FindOptionsWhere<UserRole> = isAdminOperation
      ? { id: dto.userRoleId }
      : { id: user.userRoleId };

    const userRole = await findOneOrFailTyped<UserRole>(dto.userRoleId ?? user.userRoleId, this.userRoleRepository, {
      select: {
        id: true,
        isActive: true,
        operatedByCompanyId: true,
        operatedByMainCorporateCompanyId: true,
        naatiProfile: { id: true, practitionerCpn: true },
      },
      where: whereConditions,
      relations: { naatiProfile: true },
    });

    if (!userRole.naatiProfile) {
      throw new NotFoundException(ENaatiErrorCodes.VERIFICATION_PROFILE_NOT_FOUND);
    }

    await this.accessControlService.authorizeUserRoleForOperation(user, userRole);

    if (userRole.isActive) {
      throw new BadRequestException(ENaatiErrorCodes.VERIFICATION_INVALID_USER_STATUS);
    }

    if (userRole.naatiProfile.practitionerCpn === dto.cpn) {
      throw new BadRequestException(ENaatiErrorCodes.VERIFICATION_CPN_ALREADY_SAVED);
    }

    await this.naatiProfileRepository.update(userRole.naatiProfile.id, {
      practitionerCpn: dto.cpn,
    });

    return { message: "Cpn number saved" };
  }

  public async verificationNaatiCpnNumber(
    user: ITokenUserData,
    dto: NaatiCpnQueryDto,
  ): Promise<INaatiCertifiedLanguagesListOutput> {
    const isAdminOperation = this.accessControlService.checkAdminRoleForOperation(dto, user);
    const whereConditions: FindOptionsWhere<UserRole> = isAdminOperation
      ? { id: dto.userRoleId }
      : { id: user.userRoleId };

    const queryOptions = this.naatiQueryService.getVerificationNaatiCpnNumberOptions(whereConditions);
    const userRole = await findOneOrFailTyped<TVerificationNaatiCpnNumber>(
      dto.userRoleId ?? user.userRoleId,
      this.userRoleRepository,
      queryOptions,
    );

    if (userRole.isActive) {
      throw new BadRequestException(ENaatiErrorCodes.VERIFICATION_INVALID_USER_STATUS);
    }

    let naatiResponse: INaatiApiResponseOutput;

    if (MOCK_ENABLED && dto.cpn === this.mockService.mockNaatiNumber) {
      const mock = await this.mockService.processMock({
        type: EMockType.VERIFICATION_NAATI_CPN_NUMBER,
        data: { firstName: userRole.profile.firstName, lastName: userRole.profile.lastName },
      });
      naatiResponse = mock.result;
    } else {
      naatiResponse = await this.httpRequestService.sendCpnVerificationRequest(dto);
    }

    const practitioner = await this.validateNaatiInterpreter(userRole, naatiResponse, dto);
    await this.createOrUpdateNaatiProfile(userRole, practitioner);
    await this.createOrUpdateInterpreterProfile(userRole, practitioner);
    const certifiedLanguagesList: INaatiCertifiedLanguagesListOutput = {
      primaryLanguage: ELanguages.ENGLISH,
      certifiedLanguages: practitioner.certifiedLanguages,
    };

    this.activationTrackingService.checkActivationStepsEnded(userRole).catch((error: Error) => {
      this.lokiLogger.error(`checkActivationStepsEnded error, userRoleId: ${userRole.id}`, error.stack);
    });

    return certifiedLanguagesList;
  }

  public async getInfoByCpnNumber(dto: NaatiCpnQueryDto): Promise<INaatiApiResponseOutput> {
    const naatiResponse = await this.httpRequestService.sendCpnVerificationRequest(dto);

    return naatiResponse;
  }

  public async getNaatiProfile(user: ITokenUserData, dto: OptionalUUIDParamDto): Promise<NaatiProfile | null> {
    const isAdminOperation = this.accessControlService.checkAdminRoleForOperation(dto, user);
    const whereConditions: FindOptionsWhere<NaatiProfile> = isAdminOperation
      ? { id: dto.id }
      : { userRole: { id: user.userRoleId } };

    const naatiProfile = await this.naatiProfileRepository.findOne({
      select: { userRole: { id: true, operatedByCompanyId: true, operatedByMainCorporateCompanyId: true } },
      where: whereConditions,
      relations: { userRole: true },
    });

    if (naatiProfile) {
      await this.accessControlService.authorizeUserRoleForOperation(user, naatiProfile.userRole);
    }

    return naatiProfile;
  }

  private async validateNaatiInterpreter(
    userRole: TVerificationNaatiCpnNumber,
    naatiApiResponse: INaatiApiResponseOutput,
    dto: NaatiCpnQueryDto,
  ): Promise<INaatiInterpreterProfile> {
    try {
      const { practitioner, currentCertifications, previousCertifications } = naatiApiResponse;

      if (naatiApiResponse.errorDescription) {
        throw new NotFoundException(ENaatiErrorCodes.VERIFICATION_INVALID_CPN);
      }

      if (practitioner) {
        const givenNameFromNaati = practitioner.givenName.toUpperCase().replace(REGEXP_SYMBOLS, " ").split(" ");
        const familyNameFromNaati = practitioner.familyName.toUpperCase().replace(REGEXP_SYMBOLS, " ").split(" ");
        const fullNameFromNaati = [...givenNameFromNaati, ...familyNameFromNaati];

        const isFirstNameFound = fullNameFromNaati.includes(userRole.profile.firstName.toUpperCase());
        const isLastNameFound = fullNameFromNaati.includes(userRole.profile.lastName.toUpperCase());

        if (!isFirstNameFound || !isLastNameFound) {
          throw new BadRequestException(ENaatiErrorCodes.VERIFICATION_NAME_MISMATCH);
        }
      }

      const relevantCertifications = [...currentCertifications, ...previousCertifications];
      const certifiedLanguages: INaatiCertifiedLanguages[] = [];

      for (const certification of relevantCertifications) {
        if (Object.values(EExtInterpreterLevel).includes(certification.certificationType)) {
          const language =
            certification.language1 === EExtNaatiLanguages.ENGLISH ? certification.language2 : certification.language1;
          const transformLanguage = await this.translateLanguage(language);

          if (transformLanguage !== ELanguages.ENGLISH) {
            certifiedLanguages.push({
              language: transformLanguage,
              interpreterLevel: certification.certificationType,
            });
          }
        }
      }

      return {
        practitionerCpn: practitioner.practitionerId,
        givenName: practitioner.givenName,
        familyName: practitioner.familyName,
        country: practitioner.country,
        certifiedLanguages,
      };
    } catch (error) {
      await this.logNaatiVerificationError(userRole, (error as Error).message, dto);
      throw error;
    }
  }

  public async translateLanguage(extLang: EExtNaatiLanguages): Promise<ELanguages> {
    const key = Object.keys(EExtNaatiLanguages).find(
      (key) => EExtNaatiLanguages[key as keyof typeof EExtNaatiLanguages] === extLang,
    );

    if (key && ELanguages[key as keyof typeof ELanguages]) {
      return ELanguages[key as keyof typeof ELanguages];
    } else {
      throw new BadRequestException({
        message: ENaatiErrorCodes.VERIFICATION_LANGUAGE_NOT_SUPPORTED,
        variables: { language: extLang },
      });
    }
  }

  private async createOrUpdateNaatiProfile(
    userRole: TUserInInternalNaatiDatabase,
    practitioner: INaatiInterpreterProfile,
  ): Promise<void> {
    const existingNaatiProfile = await this.naatiProfileRepository.findOne({
      where: { userRole: { id: userRole.id } },
    });

    if (!existingNaatiProfile) {
      const newNaatiProfile = this.naatiProfileRepository.create({
        userRole: userRole,
        ...practitioner,
      });
      await this.naatiProfileRepository.save(newNaatiProfile);
    }

    if (existingNaatiProfile) {
      await this.naatiProfileRepository.update(existingNaatiProfile.id, {
        ...practitioner,
        message: null,
      });
    }
  }

  private async createOrUpdateInterpreterProfile(
    userRole: TUserInInternalNaatiDatabase,
    practitioner: INaatiInterpreterProfile,
  ): Promise<void> {
    const uniqueLanguagesSet = new Set<string>(practitioner.certifiedLanguages.map((lang) => lang.language));
    uniqueLanguagesSet.add(ELanguages.ENGLISH);
    const uniqueLevelsSet = new Set<string>(practitioner.certifiedLanguages.map((lang) => lang.interpreterLevel));
    const knownUniqueLanguages = Array.from(uniqueLanguagesSet);
    const knownUniqueLevelsNaati = Array.from(uniqueLevelsSet);
    const knownUniqueLevels: ELanguageLevel[] = [];

    for (const level of knownUniqueLevelsNaati) {
      const knownLevel = await this.interpreterProfileService.mapInterpreterLevelToLanguageLevel(
        level as EExtInterpreterLevel,
      );
      knownUniqueLevels.push(knownLevel);
    }

    const interpreterProfile: IInterpreterProfile = {
      type: [EInterpreterType.INTERPRETER],
      certificateType: EInterpreterCertificateType.NAATI,
      knownLanguages: knownUniqueLanguages as ELanguages[],
      knownLevels: knownUniqueLevels,
    };

    await this.interpreterProfileService.createOrUpdateInterpreterProfile(userRole.id, interpreterProfile);
  }

  private async logNaatiVerificationError(
    userRole: TVerificationNaatiCpnNumber,
    errorMessage: string,
    dto: NaatiCpnQueryDto,
  ): Promise<void> {
    const existingNaatiProfile = await this.naatiProfileRepository.findOne({
      where: { userRole: { id: userRole.id } },
    });

    if (existingNaatiProfile) {
      await this.naatiProfileRepository.update(existingNaatiProfile.id, {
        practitionerCpn: dto.cpn,
        givenName: null,
        familyName: null,
        country: null,
        certifiedLanguages: null,
        message: errorMessage,
      });
    }

    if (!existingNaatiProfile) {
      const newNaatiProfile = this.naatiProfileRepository.create({
        userRole: userRole,
        practitionerCpn: dto.cpn,
        givenName: null,
        familyName: null,
        country: null,
        certifiedLanguages: null,
        message: errorMessage,
      });
      await this.naatiProfileRepository.save(newNaatiProfile);
    }
  }

  public async getAllNaatiProfiles(dto: GetAllInterpretersDto): Promise<GetAllInterpretersOutput> {
    const whereConditions: FindOptionsWhere<NaatiInterpreter> = {};

    if (dto.interpreterType) {
      whereConditions.mainSectionInterpreterType = dto.interpreterType;
    }

    if (dto.mainSectionLanguage) {
      whereConditions.mainSectionLanguage = dto.mainSectionLanguage;
    }

    if (dto.interpreterLevel) {
      whereConditions.languagePairs = {
        interpreterLevel: dto.interpreterLevel,
      };
    }

    if (dto.languageFrom && dto.languageTo) {
      whereConditions.languagePairs = {
        languageFrom: dto.languageFrom,
        languageTo: dto.languageTo,
      };
    }

    const [naatiProfiles, count] = await this.naatiInterpreterRepository.findAndCount({
      where: whereConditions,
      take: dto.limit,
      skip: dto.offset,
      order: { creationDate: dto.sortOrder },
      relations: {
        languagePairs: true,
      },
    });

    return { data: naatiProfiles, total: count, limit: dto.limit, offset: dto.offset };
  }

  public async deleteAllProfilesByType(interpreterType: EExtNaatiInterpreterType): Promise<void> {
    const naatiProfiles = await this.naatiInterpreterRepository.find({
      where: {
        mainSectionInterpreterType: interpreterType,
      },
      relations: {
        languagePairs: true,
      },
    });

    this.lokiLogger.log(`Naati Profiles to delete: ${naatiProfiles.length}`);

    await this.naatiInterpreterRepository.remove(naatiProfiles);
  }

  public async deleteAllProfilesByLanguage(language: EExtNaatiLanguages): Promise<void> {
    const translatedLanguage = await this.translateLanguage(language);

    const naatiProfiles = await this.naatiInterpreterRepository.find({
      where: {
        mainSectionLanguage: translatedLanguage,
      },
      relations: {
        languagePairs: true,
      },
    });

    this.lokiLogger.log(`Naati Profiles to delete: ${naatiProfiles.length}`);

    await this.naatiInterpreterRepository.remove(naatiProfiles);
  }

  public async removeNaatiProfile(id: string): Promise<void> {
    const result = await this.naatiProfileRepository.delete({ id });

    if (!result.affected || result.affected === 0) {
      throw new NotFoundException(ENaatiErrorCodes.VERIFICATION_PROFILE_NOT_FOUND);
    }

    return;
  }
}
