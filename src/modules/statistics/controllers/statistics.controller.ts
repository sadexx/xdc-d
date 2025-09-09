import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { StatisticsService } from "src/modules/statistics/services";
import {
  GetAdminInterpreterStatisticsDto,
  GetAdminStatisticsDto,
  GetAppointmentsByInterpretingTypeDto,
  GetAppointmentsByLanguageDto,
  GetAppointmentsWithoutInterpreterDto,
  GetCancelledAppointmentDto,
  GetAppointmentsByTypeDto,
  GetRejectedVsAcceptedAppointmentsDto,
  GetRejectedVsAcceptedAppointmentsGeneralDto,
  GetStatisticsByDatesDto,
} from "src/modules/statistics/common/dto";
import {
  IGetFirstStatisticRecordOutput,
  IChartLineDataOutput,
  IChartActiveMembershipsLineDataOutput,
} from "src/modules/statistics/common/outputs";

@Controller("statistics")
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-first-admin-record-date")
  async getFirstAdminRecordDate(): Promise<IGetFirstStatisticRecordOutput> {
    return await this.statisticsService.getFirstAdminRecordDate();
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-registered-and-active-users")
  async getRegisteredAndActiveUsers(@Query() dto: GetAdminStatisticsDto): Promise<IChartLineDataOutput> {
    return await this.statisticsService.getRegisteredAndActiveUsers(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-inactive-users")
  async getInactiveUsers(@Query() dto: GetAdminStatisticsDto): Promise<IChartLineDataOutput> {
    return await this.statisticsService.getInactiveUsers(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-unsuccessful-registration-attempts-users")
  async getUnsuccessfulRegistrationAttemptsUsers(@Query() dto: GetAdminStatisticsDto): Promise<IChartLineDataOutput> {
    return await this.statisticsService.getUnsuccessfulRegistrationAttemptsUsers(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-new-registration-users")
  async getNewRegistrationUsers(@Query() dto: GetAdminStatisticsDto): Promise<IChartLineDataOutput> {
    return await this.statisticsService.getNewRegistrationUsers(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-active-interpreters")
  async getActiveInterpreters(@Query() dto: GetAdminInterpreterStatisticsDto): Promise<IChartLineDataOutput> {
    return await this.statisticsService.getActiveInterpreters(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-deleted")
  async getDeleted(@Query() dto: GetAdminStatisticsDto): Promise<IChartLineDataOutput> {
    return await this.statisticsService.getDeleted(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-rejected-vs-accepted-appointments")
  async getRejectedVsAcceptedAppointments(
    @Query() dto: GetRejectedVsAcceptedAppointmentsGeneralDto,
  ): Promise<IChartLineDataOutput> {
    return await this.statisticsService.getRejectedVsAcceptedAppointments(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-rejected-vs-accepted-appointments-by-interpreter")
  async getRejectedVsAcceptedAppointmentsByInterpreter(
    @Query() dto: GetRejectedVsAcceptedAppointmentsDto,
  ): Promise<IChartLineDataOutput> {
    return await this.statisticsService.getRejectedVsAcceptedAppointmentsByInterpreter(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-created-vs-completed-appointments-by-type")
  async getCreatedVsCompletedAppointmentsByType(@Query() dto: GetAppointmentsByTypeDto): Promise<IChartLineDataOutput> {
    return await this.statisticsService.getCreatedVsCompletedAppointmentsByType(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-created-vs-completed-appointments-by-language")
  async getCreatedVsCompletedAppointmentsByLanguage(
    @Query() dto: GetAppointmentsByLanguageDto,
  ): Promise<IChartLineDataOutput> {
    return await this.statisticsService.getCreatedVsCompletedAppointmentsByLanguage(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-created-vs-completed-appointments-by-interpreting-type")
  async getCreatedVsCompletedAppointmentsByInterpretingType(
    @Query() dto: GetAppointmentsByInterpretingTypeDto,
  ): Promise<IChartLineDataOutput> {
    return await this.statisticsService.getCreatedVsCompletedAppointmentsByInterpretingType(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-cancelled-appointments")
  async getCancelledAppointments(@Query() dto: GetCancelledAppointmentDto): Promise<IChartLineDataOutput> {
    return await this.statisticsService.getCancelledAppointments(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-appointments-duration")
  async getAppointmentsDuration(@Query() dto: GetAppointmentsByTypeDto): Promise<IChartLineDataOutput> {
    return await this.statisticsService.getAppointmentsDuration(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-appointments-by-interpreter-gender")
  async getAppointmentsByInterpreterGender(@Query() dto: GetStatisticsByDatesDto): Promise<IChartLineDataOutput> {
    return await this.statisticsService.getAppointmentsByInterpreterGender(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-appointments-without-interpreter")
  async getAppointmentsWithoutInterpreterByType(
    @Query() dto: GetAppointmentsWithoutInterpreterDto,
  ): Promise<IChartLineDataOutput> {
    return await this.statisticsService.getAppointmentsWithoutInterpreterByType(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-unanswered-on-demand-requests")
  async getUnansweredOnDemandRequests(@Query() dto: GetAppointmentsByLanguageDto): Promise<IChartLineDataOutput> {
    return await this.statisticsService.getUnansweredOnDemandRequests(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("get-active-memberships")
  async getActiveMemberships(@Query() dto: GetStatisticsByDatesDto): Promise<IChartActiveMembershipsLineDataOutput> {
    return await this.statisticsService.getActiveMembershipsByType(dto);
  }
}
