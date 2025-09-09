import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from "@nestjs/common";
import { NaatiService, NaatiWebScraperService } from "src/modules/naati/services";
import {
  GetAllInterpretersDto,
  InterpreterLanguageDto,
  NaatiCpnQueryDto,
  WebScraperQueryDto,
} from "src/modules/naati/common/dto";
import { CurrentUser } from "src/common/decorators";
import {
  JwtFullAccessGuard,
  JwtRequiredInfoOrActivationOrFullAccessGuard,
  RolesGuard,
} from "src/modules/auth/common/guards";
import { NaatiProfile } from "src/modules/naati/entities";
import { EExtNaatiLanguages } from "src/modules/naati/common/enum";
import { ELanguages } from "src/modules/interpreters/profile/common/enum";
import {
  GetAllInterpretersOutput,
  INaatiApiResponseOutput,
  INaatiCertifiedLanguagesListOutput,
} from "src/modules/naati/common/outputs";
import { OptionalUUIDParamDto, UUIDParamDto } from "src/common/dto";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { IMessageOutput } from "src/common/outputs";

@Controller("naati")
export class NaatiController {
  constructor(
    private readonly naatiService: NaatiService,
    private readonly naatiWebScraperService: NaatiWebScraperService,
  ) {}

  @Get("/internal-verification")
  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  async getInternalNaatiInfo(@CurrentUser() user: ITokenUserData): Promise<INaatiCertifiedLanguagesListOutput> {
    return this.naatiService.findCurrentUserInInternalDatabase(user);
  }

  @Post("/cpn-info-saving")
  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  async saveCpnNaatiInfo(@CurrentUser() user: ITokenUserData, @Query() dto: NaatiCpnQueryDto): Promise<IMessageOutput> {
    return this.naatiService.saveCpnNaatiInfo(user, dto);
  }

  @Post("/cpn-verification")
  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  async getNaatiInfo(
    @CurrentUser() user: ITokenUserData,
    @Query() dto: NaatiCpnQueryDto,
  ): Promise<INaatiCertifiedLanguagesListOutput> {
    return this.naatiService.verificationNaatiCpnNumber(user, dto);
  }

  @Post("/cpn-info")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async getCpnNaatiInfo(@Query() dto: NaatiCpnQueryDto): Promise<INaatiApiResponseOutput> {
    return this.naatiService.getInfoByCpnNumber(dto);
  }

  @Get("user-profile")
  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  async getNaatiProfile(
    @CurrentUser() user: ITokenUserData,
    @Query() dto: OptionalUUIDParamDto,
  ): Promise<NaatiProfile | null> {
    return this.naatiService.getNaatiProfile(user, dto);
  }

  @Get("interpreters")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async getAllNaatiProfiles(@Query() dto: GetAllInterpretersDto): Promise<GetAllInterpretersOutput> {
    return this.naatiService.getAllNaatiProfiles(dto);
  }

  @Get("nonce-token")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async updateNonceToken(): Promise<{
    message: string;
  }> {
    return this.naatiWebScraperService.updateNonceToken();
  }

  @Post("update-all-profile")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async fullUpdateDatabase(@Query() { interpreterType }: WebScraperQueryDto): Promise<{
    message: string;
  }> {
    return this.naatiWebScraperService.launchBackgroundFullUpdate(interpreterType);
  }

  @Get("language-levels")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async languageLevels(): Promise<EExtNaatiLanguages[]> {
    return Object.values(EExtNaatiLanguages);
  }

  @Post("update-profiles/:language")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async updateProfileByLanguage(
    @Param() { language }: InterpreterLanguageDto,
    @Query() { interpreterType }: WebScraperQueryDto,
  ): Promise<{
    message: string;
  }> {
    return this.naatiWebScraperService.launchBackgroundLanguageUpdate(interpreterType, language);
  }

  @Get("language-compere")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async languageCompere(): Promise<{
    missingInEnum1: string[];
    missingInEnum2: string[];
  }> {
    return this.naatiWebScraperService.languageCompere(EExtNaatiLanguages, ELanguages);
  }

  @Delete("user-profile")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeNaatiProfile(@Query() { id }: UUIDParamDto): Promise<void> {
    return this.naatiService.removeNaatiProfile(id);
  }
}
