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
  UseGuards,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import {
  CreateCompanyDto,
  CreateCompanyRegistrationRequestDto,
  GetCompaniesDto,
  UpdateCompanyProfileDto,
  UpdateCompanyRegistrationRequestDto,
  UpdateCompanySubStatusDto,
} from "src/modules/companies/common/dto";
import { CompaniesQueryService, CompaniesService } from "src/modules/companies/services";
import {
  JwtFullAccessGuard,
  JwtRequiredInfoOrActivationOrFullAccessGuard,
  RolesGuard,
} from "src/modules/auth/common/guards";
import { UUIDParamDto } from "src/common/dto";
import { CurrentUser } from "src/common/decorators";
import { UserRole } from "src/modules/users/entities";
import { CompanyIdOutput, GetCompaniesOutput, SendInvitationLinkOutput } from "src/modules/companies/common/outputs";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { NotEmptyBodyPipe, OrderLimitPipe } from "src/common/pipes";
import { Company } from "src/modules/companies/entities";

@Controller("companies")
export class CompaniesController {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly companiesQueryService: CompaniesQueryService,
  ) {}

  @Post("create-company-registration-request")
  async createCompanyRegistrationRequest(@Body() dto: CreateCompanyRegistrationRequestDto): Promise<CompanyIdOutput> {
    return await this.companiesService.createCompanyRegistrationRequest(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @UsePipes(NotEmptyBodyPipe)
  @Patch("update-company-registration-request")
  async updateCompanyRegistrationRequest(@Body() dto: UpdateCompanyRegistrationRequestDto): Promise<CompanyIdOutput> {
    return await this.companiesService.updateCompanyRegistrationRequest(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Post("create-company")
  async createCompany(@Body() dto: CreateCompanyDto, @CurrentUser() user: ITokenUserData): Promise<CompanyIdOutput> {
    return await this.companiesService.createCompany(dto, user);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete("remove-company-registration-request")
  async removeCompanyRegistrationRequest(
    @Query() { id }: UUIDParamDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<void> {
    return await this.companiesService.removeRequest(id, user);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Patch("update-company-sub-status")
  async updateCompanySubStatus(@Body() dto: UpdateCompanySubStatusDto): Promise<CompanyIdOutput> {
    return await this.companiesService.updateCompanySubStatus(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Post("send-super-admin-invitation-link")
  async sendSuperAdminInvitationLink(
    @Body() { id }: UUIDParamDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<SendInvitationLinkOutput> {
    return await this.companiesService.sendSuperAdminInvitationLink(id, user);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @UsePipes(OrderLimitPipe)
  @Get()
  public async getCompanies(
    @Query(new ValidationPipe({ transform: true })) getCompaniesDto: GetCompaniesDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<GetCompaniesOutput> {
    return await this.companiesQueryService.getCompanies(getCompaniesDto, user);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Get("my-company")
  public async getCompanyByUser(@CurrentUser() user: ITokenUserData): Promise<Company | null> {
    return await this.companiesQueryService.getCompanyByUser(user);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-by-id/:id")
  public async getCompany(@Param() { id }: UUIDParamDto, @CurrentUser() user: ITokenUserData): Promise<Company | null> {
    return await this.companiesQueryService.getCompany(id, user);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @UsePipes(NotEmptyBodyPipe)
  @Patch("update-company-profile")
  public async updateCompanyProfile(
    @Body() dto: UpdateCompanyProfileDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<void> {
    return await this.companiesService.updateCompanyProfile(dto, user);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-super-admin-by-company-id/:id")
  public async getSuperAdminByCompanyId(
    @Param() { id }: UUIDParamDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<UserRole | null> {
    return await this.companiesQueryService.getSuperAdminByCompanyId(id, user);
  }
}
