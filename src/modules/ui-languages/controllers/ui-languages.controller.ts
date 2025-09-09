import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Redirect,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { JwtFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { CustomFileInterceptor } from "src/modules/file-management/common/interceptors";
import { LanguageParamDto } from "src/modules/ui-languages/common/dto";
import { EPossibleUiLanguage } from "src/modules/ui-languages/common/enums";
import { UiLanguagesService } from "src/modules/ui-languages/services";
import { IFile } from "src/modules/file-management/common/interfaces";
import { IRedirectUrlOutput } from "src/common/outputs";

@Controller("ui-languages")
export class UiLanguagesController {
  constructor(private readonly uiLanguagesService: UiLanguagesService) {}

  @Get()
  async find(): Promise<{
    supportedLanguages: Record<
      EPossibleUiLanguage,
      {
        version: number;
      }
    >;
  }> {
    return await this.uiLanguagesService.find();
  }

  @Get("json/:language")
  @Redirect("", HttpStatus.MOVED_PERMANENTLY)
  async findLanguageFile(@Param() languageParamDto: LanguageParamDto): Promise<IRedirectUrlOutput> {
    const fileUrl = await this.uiLanguagesService.findOne(languageParamDto.language);

    return { url: fileUrl };
  }

  @Post("json/:language")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @UseInterceptors(CustomFileInterceptor)
  async updateLanguageFile(
    @Param() languageParamDto: LanguageParamDto,
    @UploadedFile() file: IFile,
  ): Promise<{
    message: string;
    language: EPossibleUiLanguage;
  }> {
    return await this.uiLanguagesService.update(languageParamDto.language, file);
  }
}
