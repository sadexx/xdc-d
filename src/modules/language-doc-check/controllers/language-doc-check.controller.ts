import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from "@nestjs/common";
import { CurrentUser } from "src/common/decorators";
import {
  JwtFullAccessGuard,
  JwtRequiredInfoOrActivationOrFullAccessGuard,
  RolesGuard,
} from "src/modules/auth/common/guards";
import { CustomFileInterceptor } from "src/modules/file-management/common/interceptors";
import { OptionalUUIDParamDto, UUIDParamDto } from "src/common/dto";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { LanguageDocCheckService } from "src/modules/language-doc-check/services/language-doc-check.service";
import {
  CreateLanguageDocCheckDto,
  LanguageDocCheckManualDecisionDto,
  UpdateLanguageDocCheckDto,
} from "src/modules/language-doc-check/common/dto";
import { CreateLanguageDocCheckOutput, GetLanguageDocCheckOutput } from "src/modules/language-doc-check/common/outputs";
import { NotEmptyBodyPipe } from "src/common/pipes";
import { IFile } from "src/modules/file-management/common/interfaces";

@Controller("language-doc-check")
export class LanguageDocCheckController {
  constructor(private readonly languageDocCheckService: LanguageDocCheckService) {}

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Get()
  async getUsersLanguageDocChecks(
    @CurrentUser() user: ITokenUserData,
    @Query() dto: OptionalUUIDParamDto,
  ): Promise<GetLanguageDocCheckOutput[]> {
    return this.languageDocCheckService.getUsersLanguageDocChecks(user, dto);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @UsePipes(NotEmptyBodyPipe)
  @Post()
  async createLanguageDocCheck(
    @Body() dto: CreateLanguageDocCheckDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<CreateLanguageDocCheckOutput> {
    return this.languageDocCheckService.createLanguageDocCheck(dto, user);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @UseInterceptors(CustomFileInterceptor)
  @Post("upload-docs")
  async uploadFileToLanguageDocCheck(
    @Query() { id }: UUIDParamDto,
    @CurrentUser() user: ITokenUserData,
    @UploadedFile() file: IFile,
  ): Promise<void> {
    return this.languageDocCheckService.uploadFileToLanguageDocCheck(id, user, file);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @UseInterceptors(CustomFileInterceptor)
  @Patch()
  async updateLanguageDocCheck(
    @Query() dto: UpdateLanguageDocCheckDto,
    @CurrentUser() user: ITokenUserData,
    @UploadedFile() file: IFile,
  ): Promise<void> {
    return this.languageDocCheckService.updateLanguageDocCheck(dto, user, file);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Patch("manual-decision")
  async languageDocCheckManualDecision(
    @Body() dto: LanguageDocCheckManualDecisionDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<void> {
    return this.languageDocCheckService.languageDocCheckManualDecision(dto, user);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete()
  async removeLanguageDocCheck(@Query() { id }: UUIDParamDto, @CurrentUser() user: ITokenUserData): Promise<void> {
    return this.languageDocCheckService.removeLanguageDocCheck(id, user);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete("remove-file")
  async removeLanguageDocCheckFile(@Query() { id }: UUIDParamDto, @CurrentUser() user: ITokenUserData): Promise<void> {
    return this.languageDocCheckService.removeLanguageDocCheckFile(id, user);
  }
}
