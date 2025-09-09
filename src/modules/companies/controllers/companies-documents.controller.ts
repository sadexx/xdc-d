import {
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
import { GetCompanyDocumentsDto, UploadDocDto } from "src/modules/companies/common/dto";
import { CompaniesDocumentsService, CompaniesQueryService } from "src/modules/companies/services";
import { CompanyDocument } from "src/modules/companies/entities";
import { UUIDParamDto } from "src/common/dto";
import { CustomFileInterceptor } from "src/modules/file-management/common/interceptors";
import { CurrentUser } from "src/common/decorators";
import {
  JwtFullAccessGuard,
  JwtRequiredInfoOrActivationOrFullAccessGuard,
  RolesGuard,
} from "src/modules/auth/common/guards";
import { CompanyDocumentIdOutput, GetDocumentOutput } from "src/modules/companies/common/outputs";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { IFile } from "src/modules/file-management/common/interfaces";

@Controller("companies/documents")
export class CompaniesDocumentsController {
  constructor(
    private readonly companiesDocumentsService: CompaniesDocumentsService,
    private readonly companiesQueryService: CompaniesQueryService,
  ) {}

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @UseInterceptors(CustomFileInterceptor)
  @Post("upload")
  async uploadDoc(
    @UploadedFile() file: IFile,
    @Query() dto: UploadDocDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<CompanyDocumentIdOutput> {
    return await this.companiesDocumentsService.uploadDoc(dto, file, user);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Patch("approve")
  async approveDoc(@Query() { id }: UUIDParamDto): Promise<void> {
    return await this.companiesDocumentsService.approveDoc(id);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete("remove")
  async removeDoc(@Query() { id }: UUIDParamDto, @CurrentUser() user: ITokenUserData): Promise<void> {
    return await this.companiesDocumentsService.removeDoc(id, user);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Get("all")
  public async getDocs(
    @Query() { companyId }: GetCompanyDocumentsDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<CompanyDocument[]> {
    return await this.companiesQueryService.getDocs(user, companyId);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Get(":id")
  public async getDoc(@Param() { id }: UUIDParamDto, @CurrentUser() user: ITokenUserData): Promise<GetDocumentOutput> {
    return await this.companiesQueryService.getDoc(id, user);
  }
}
