import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { CompanyStatisticsInterpreterService } from "src/modules/statistics/services";
import {
  GetAppointmentsByLanguageAndCompanyDto,
  GetCancelledAppointmentByInterpreterCompanyDto,
  GetCreatedVsCompletedAppointmentsByTypeAndCompanyDto,
  GetCreatedVsCompletedAppointmentsByTypeAndInterpreterCompanyDto,
  GetHomepageBaseAppointmentStatisticByCompanyDto,
  GetRejectedVsAcceptedAppointmentsByCompanyDto,
} from "src/modules/statistics/common/dto";
import { CurrentUser } from "src/common/decorators";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import {
  IChartHomepageLineDataOutput,
  IChartLineDataOutput,
  IGetHomepageBaseAppointmentStatisticOutput,
} from "src/modules/statistics/common/outputs";

@Controller("statistics/company/interpreter")
export class CompanyStatisticsInterpreterController {
  constructor(private readonly companyStatisticsInterpreterService: CompanyStatisticsInterpreterService) {}

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-clients-created-vs-completed-appointments-by-type")
  async getCreatedVsCompletedAppointmentsOfClientsByTypeAndInterpreterCompany(
    @Query() dto: GetCreatedVsCompletedAppointmentsByTypeAndCompanyDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IChartLineDataOutput> {
    return await this.companyStatisticsInterpreterService.getCreatedVsCompletedAppointmentsOfClientsByTypeAndInterpreterCompany(
      dto,
      user,
    );
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-clients-created-vs-completed-appointments-by-language")
  async getCreatedVsCompletedAppointmentsOfClientsByLanguageAndInterpreterCompany(
    @Query() dto: GetAppointmentsByLanguageAndCompanyDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IChartLineDataOutput> {
    return await this.companyStatisticsInterpreterService.getCreatedVsCompletedAppointmentsOfClientsByLanguageAndInterpreterCompany(
      dto,
      user,
    );
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-appointments-duration")
  async getAppointmentsDurationByInterpreterCompany(
    @Query() dto: GetCreatedVsCompletedAppointmentsByTypeAndInterpreterCompanyDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IChartLineDataOutput> {
    return await this.companyStatisticsInterpreterService.getAppointmentsDurationByInterpreterCompany(dto, user);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-cancelled-clients-appointments")
  async getCancelledClientsAppointmentsByInterpreterCompany(
    @Query() dto: GetCancelledAppointmentByInterpreterCompanyDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IChartLineDataOutput> {
    return await this.companyStatisticsInterpreterService.getCancelledClientsAppointmentsByInterpreterCompany(
      dto,
      user,
    );
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-completed-appointments-by-type")
  async getCompletedAppointmentsByTypeAndInterpreterCompany(
    @Query() dto: GetCreatedVsCompletedAppointmentsByTypeAndCompanyDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IChartLineDataOutput> {
    return await this.companyStatisticsInterpreterService.getCompletedAppointmentsByTypeAndInterpreterCompany(
      dto,
      user,
    );
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-canceled-appointments-by-type-and-interpreter")
  async getCancelledInterpretersAppointmentsByInterpreterCompany(
    @Query() dto: GetCancelledAppointmentByInterpreterCompanyDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IChartLineDataOutput> {
    return await this.companyStatisticsInterpreterService.getCancelledInterpretersAppointmentsByInterpreterCompany(
      dto,
      user,
    );
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-homepage-statistic")
  async getHomepageStatisticByCompany(
    @Query() dto: GetHomepageBaseAppointmentStatisticByCompanyDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IGetHomepageBaseAppointmentStatisticOutput> {
    return await this.companyStatisticsInterpreterService.getHomepageBaseAppointmentInfoByCompanyId(dto, user);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-homepage-charts-appointment-statistic")
  async getHomepageChartsAppointmentInfoByCompanyId(
    @Query() dto: GetHomepageBaseAppointmentStatisticByCompanyDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IChartHomepageLineDataOutput> {
    return await this.companyStatisticsInterpreterService.getHomepageChartsAppointmentInfoByCompanyId(dto, user);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-rejected-vs-accepted-appointments-by-interpreter-and-company")
  async getRejectedVsAcceptedAppointmentsByInterpreter(
    @Query() dto: GetRejectedVsAcceptedAppointmentsByCompanyDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IChartLineDataOutput> {
    return await this.companyStatisticsInterpreterService.getRejectedVsAcceptedAppointmentsByInterpreterAndCompany(
      dto,
      user,
    );
  }
}
