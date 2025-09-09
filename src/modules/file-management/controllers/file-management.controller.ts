import { Controller, Get, Post, Query, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { JwtFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { FileManagementService } from "src/modules/file-management/services";
import { CustomFileInterceptor } from "src/modules/file-management/common/interceptors";
import { TermsDownloadParamDto, TermsUploadParamDto } from "src/modules/file-management/common/dto";
import { IMessageOutput } from "src/common/outputs";
import { IFile } from "src/modules/file-management/common/interfaces";

@Controller("file-management")
export class FileManagementController {
  constructor(private readonly fileManagementService: FileManagementService) {}

  @Post("upload-terms")
  @UseInterceptors(CustomFileInterceptor)
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async uploadTerms(
    @Query() termsUploadParamDto: TermsUploadParamDto,
    @UploadedFile() file: IFile,
  ): Promise<IMessageOutput> {
    await this.fileManagementService.uploadTerms(termsUploadParamDto.role, file);

    return {
      message: `${termsUploadParamDto.documentType} for ${termsUploadParamDto.role} has been successfully uploaded!`,
    };
  }

  @Get("download-terms")
  async downloadTerms(@Query() termsDownloadParamDto: TermsDownloadParamDto): Promise<string[]> {
    return this.fileManagementService.downloadTerms(termsDownloadParamDto.role);
  }
}
