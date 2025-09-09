import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { UUIDParamDto } from "src/common/dto";
import { JwtFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import {
  CreatePromoDto,
  DeletePromoByIdAndLanguageQueryDto,
  GetOneContentByLanguageQueryDto,
  SaveImageQueryDto,
  UpdateContentManagementDto,
  UpdatePromoDto,
} from "src/modules/content-management/common/dto";
import { ContentManagement, Promo } from "src/modules/content-management/entities";
import { CustomFileInterceptor } from "src/modules/file-management/common/interceptors";
import { SaveImageOutput } from "src/modules/content-management/common/outputs";
import { ContentManagementService } from "src/modules/content-management/services";
import { IMessageOutput } from "src/common/outputs";
import { IFile } from "src/modules/file-management/common/interfaces";

@Controller("content-management")
export class ContentManagementController {
  constructor(private readonly contentManagementService: ContentManagementService) {}

  @Post("promo")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async createPromo(@Body() dto: CreatePromoDto): Promise<Promo> {
    return this.contentManagementService.createPromo(dto);
  }

  @Get("promo/:id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async getOnePromoById(@Param() { id }: UUIDParamDto): Promise<Promo> {
    return this.contentManagementService.getOnePromoById(id);
  }

  @Delete("promo")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePromoByIdAndLanguage(@Query() dto: DeletePromoByIdAndLanguageQueryDto): Promise<void> {
    return await this.contentManagementService.deletePromoById(dto.id, dto.language);
  }

  @Patch("promo")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async updatePromoById(@Body() dto: UpdatePromoDto): Promise<Promo> {
    return this.contentManagementService.updatePromoById(dto);
  }

  @Get()
  async getContentManagementByLanguage(@Query() dto: GetOneContentByLanguageQueryDto): Promise<ContentManagement> {
    return this.contentManagementService.getContentManagementByLanguage(dto.language);
  }

  @Patch()
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async updateContentManagementByLanguage(@Body() dto: UpdateContentManagementDto): Promise<IMessageOutput> {
    return this.contentManagementService.updateContentManagementByLanguage(dto);
  }

  @Post("image")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @UseInterceptors(CustomFileInterceptor)
  async saveImage(@UploadedFile() file: IFile, @Query() _dto: SaveImageQueryDto): Promise<SaveImageOutput> {
    return this.contentManagementService.saveImage(file);
  }
}
