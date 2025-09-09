import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { CompanyStatisticsClientService } from "src/modules/statistics/services";
import {
  GetAppointmentsByInterpretingTypeAndCompanyAndUserDto,
  GetAppointmentsByInterpretingTypeAndCompanyDto,
  GetAppointmentsByLanguageAndCompanyAndUserDto,
  GetAppointmentsByLanguageAndCompanyDto,
  GetAppointmentsWithoutInterpreterByCompanyDto,
  GetCancelledAppointmentsByCompanyAndUserDto,
  GetCancelledAppointmentsByCompanyDto,
  GetCreatedVsCompletedAppointmentsByTypeAndCompanyAndUserDto,
  GetCreatedVsCompletedAppointmentsByTypeAndCompanyDto,
  GetHomepageBaseAppointmentStatisticByCompanyDto,
  GetSpentCostByCompany,
} from "src/modules/statistics/common/dto";
import { CurrentUser } from "src/common/decorators";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import {
  IChartHomepageLineDataOutput,
  IChartLineDataOutput,
  IChartRoundDataOutput,
  IGetHomepageBaseAppointmentStatisticOutput,
} from "src/modules/statistics/common/outputs";

@Controller("statistics/company/client")
export class CompanyStatisticsClientController {
  constructor(private readonly companyStatisticsClientService: CompanyStatisticsClientService) {}

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-created-vs-completed-appointments-by-type")
  async getCreatedVsCompletedAppointmentsByTypeAndCompany(
    @Query() dto: GetCreatedVsCompletedAppointmentsByTypeAndCompanyDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IChartLineDataOutput> {
    return await this.companyStatisticsClientService.getCreatedVsCompletedAppointmentsByTypeAndCompany(dto, user);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-created-vs-completed-appointments-by-language")
  async getCreatedVsCompletedAppointmentsByLanguageAndCompany(
    @Query() dto: GetAppointmentsByLanguageAndCompanyDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IChartLineDataOutput> {
    return await this.companyStatisticsClientService.getCreatedVsCompletedAppointmentsByLanguageAndCompany(dto, user);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-created-vs-completed-appointments-by-interpreting-type")
  async getCreatedVsCompletedAppointmentsByInterpretingTypeAndCompany(
    @Query() dto: GetAppointmentsByInterpretingTypeAndCompanyDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IChartLineDataOutput> {
    return await this.companyStatisticsClientService.getCreatedVsCompletedAppointmentsByInterpretingTypeAndCompany(
      dto,
      user,
    );
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-cancelled-appointments")
  async getCancelledAppointmentsByCompany(
    @Query() dto: GetCancelledAppointmentsByCompanyDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IChartLineDataOutput> {
    return await this.companyStatisticsClientService.getCancelledAppointmentsByCompany(dto, user);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-appointments-duration")
  async getAppointmentsDurationByCompany(
    @Query() dto: GetCreatedVsCompletedAppointmentsByTypeAndCompanyDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IChartLineDataOutput> {
    return await this.companyStatisticsClientService.getAppointmentsDurationByCompany(dto, user);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-created-vs-completed-appointments-by-type-and-client")
  async getCreatedVsCompletedAppointmentsByTypeAndCompanyAndClient(
    @Query() dto: GetCreatedVsCompletedAppointmentsByTypeAndCompanyAndUserDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IChartLineDataOutput> {
    return await this.companyStatisticsClientService.getCreatedVsCompletedAppointmentsByTypeAndCompanyAndClient(
      dto,
      user,
    );
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-created-vs-completed-appointments-by-language-and-client")
  async getCreatedVsCompletedAppointmentsByLanguageAndCompanyAndClient(
    @Query() dto: GetAppointmentsByLanguageAndCompanyAndUserDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IChartLineDataOutput> {
    return await this.companyStatisticsClientService.getCreatedVsCompletedAppointmentsByLanguageAndCompanyAndClient(
      dto,
      user,
    );
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-created-vs-completed-appointments-by-interpreting-type-and-client")
  async getCreatedVsCompletedAppointmentsByInterpretingTypeAndCompanyAndClient(
    @Query() dto: GetAppointmentsByInterpretingTypeAndCompanyAndUserDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IChartLineDataOutput> {
    return await this.companyStatisticsClientService.getCreatedVsCompletedAppointmentsByInterpretingTypeAndCompanyAndClient(
      dto,
      user,
    );
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-cancelled-appointments-by-client")
  async getCancelledAppointmentsByCompanyAndClient(
    @Query() dto: GetCancelledAppointmentsByCompanyAndUserDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IChartLineDataOutput> {
    return await this.companyStatisticsClientService.getCancelledAppointmentsByCompanyAndClient(dto, user);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-appointments-duration-by-client")
  async getAppointmentsDurationByCompanyAndClient(
    @Query() dto: GetCreatedVsCompletedAppointmentsByTypeAndCompanyAndUserDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IChartLineDataOutput> {
    return await this.companyStatisticsClientService.getAppointmentsDurationByCompanyAndClient(dto, user);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-homepage-statistic")
  async getHomepageStatisticByCompany(
    @Query() dto: GetHomepageBaseAppointmentStatisticByCompanyDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IGetHomepageBaseAppointmentStatisticOutput> {
    return await this.companyStatisticsClientService.getHomepageBaseAppointmentInfoByCompanyId(dto, user);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-homepage-charts-appointment-statistic")
  async getHomepageChartsAppointmentInfoByCompanyId(
    @Query() dto: GetHomepageBaseAppointmentStatisticByCompanyDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IChartHomepageLineDataOutput> {
    return await this.companyStatisticsClientService.getHomepageChartsAppointmentInfoByCompanyId(dto, user);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-appointments-without-interpreter-by-company")
  async getAppointmentsWithoutInterpreterByTypeAndCompany(
    @Query() dto: GetAppointmentsWithoutInterpreterByCompanyDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IChartLineDataOutput> {
    return await this.companyStatisticsClientService.getAppointmentsWithoutInterpreterByTypeAndCompany(dto, user);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-spent-cost-by-interpreting-type-and-company")
  async getSpentCostByCompany(
    @Query() dto: GetSpentCostByCompany,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IChartRoundDataOutput> {
    return await this.companyStatisticsClientService.getSpentCostByCompany(dto, user);
  }
}
