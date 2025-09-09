import { Controller, Get, Query, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { CsvService } from "src/modules/csv/services";
import { CurrentUser } from "src/common/decorators";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import {
  GetCsvAppointmentsDto,
  GetCsvCompaniesDto,
  GetCsvDraftAppointmentsDto,
  GetCsvEmployeesDto,
  GetCsvUsersDto,
} from "src/modules/csv/common/dto";
import { JwtFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";

@Controller("csv/download")
export class CsvController {
  constructor(private readonly csvService: CsvService) {}

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("appointments")
  async downloadAppointmentsCsv(
    @Res() res: Response,
    @CurrentUser() user: ITokenUserData,
    @Query() dto: GetCsvAppointmentsDto,
  ): Promise<void> {
    await this.csvService.exportAppointmentsCsv(res, user, dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("appointments/archived")
  async downloadArchivedAppointmentsCsv(
    @Res() res: Response,
    @CurrentUser() user: ITokenUserData,
    @Query() dto: GetCsvAppointmentsDto,
  ): Promise<void> {
    await this.csvService.exportAppointmentsCsv(res, user, dto, true);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("appointments/draft")
  async downloadDraftAppointmentsCsv(
    @Res() res: Response,
    @CurrentUser() user: ITokenUserData,
    @Query() dto: GetCsvDraftAppointmentsDto,
  ): Promise<void> {
    await this.csvService.exportDraftAppointmentsCsv(res, user, dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("users")
  async downloadUsersCsv(
    @Res() res: Response,
    @CurrentUser() user: ITokenUserData,
    @Query() dto: GetCsvUsersDto,
  ): Promise<void> {
    return this.csvService.exportUsersCsv(res, user, dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("companies")
  async downloadCompaniesCsv(
    @Res() res: Response,
    @CurrentUser() user: ITokenUserData,
    @Query() dto: GetCsvCompaniesDto,
  ): Promise<void> {
    return this.csvService.exportCompaniesCsv(res, user, dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("employees")
  async downloadEmployeesCsv(
    @Res() res: Response,
    @CurrentUser() user: ITokenUserData,
    @Query() dto: GetCsvEmployeesDto,
  ): Promise<void> {
    return this.csvService.exportEmployeesCsv(res, user, dto);
  }
}
