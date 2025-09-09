import { Body, Controller, Get, Param, Post, Query, UseGuards, UsePipes } from "@nestjs/common";
import { CreateEmployeeDto, GetEmployeesDto, SendEmployeeInvitationLinkDto } from "src/modules/companies/common/dto";
import { CompaniesEmployeeService, CompaniesQueryService } from "src/modules/companies/services";
import { JwtFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { CurrentUser } from "src/common/decorators";
import { UUIDParamDto } from "src/common/dto";
import { UserRole } from "src/modules/users/entities";
import { GetEmployeesOutput, SendEmployeeInvitationLinkOutput } from "src/modules/companies/common/outputs";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { OrderLimitPipe } from "src/common/pipes";

@Controller("companies/employee")
export class CompaniesEmployeeController {
  constructor(
    private readonly companiesEmployeeService: CompaniesEmployeeService,
    private readonly companiesQueryService: CompaniesQueryService,
  ) {}

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Post("create")
  public async createEmployee(
    @Body() dto: CreateEmployeeDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<SendEmployeeInvitationLinkOutput> {
    return await this.companiesEmployeeService.createEmployee(dto, user);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Post("resend-invitation-link")
  public async resendEmployeeInvitationLink(
    @Body() dto: SendEmployeeInvitationLinkDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<SendEmployeeInvitationLinkOutput> {
    return await this.companiesEmployeeService.resendEmployeeInvitationLink(dto, user);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @UsePipes(OrderLimitPipe)
  @Get()
  public async getAll(@Query() dto: GetEmployeesDto, @CurrentUser() user: ITokenUserData): Promise<GetEmployeesOutput> {
    return await this.companiesQueryService.getAllEmployees(dto, user);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-by-id/:id")
  public async getById(@Param() { id }: UUIDParamDto, @CurrentUser() user: ITokenUserData): Promise<UserRole | null> {
    return await this.companiesQueryService.getById(id, user);
  }
}
