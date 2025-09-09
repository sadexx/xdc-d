import { Controller, Get, Param, Query, UseGuards, UsePipes } from "@nestjs/common";
import { CurrentUser } from "src/common/decorators";
import { PlatformIdParamDto, UUIDParamDto } from "src/common/dto";
import { GetAllAppointmentsOutput } from "src/modules/appointments/appointment/common/outputs";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { AppointmentQueryService } from "src/modules/appointments/appointment/services";
import { JwtFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { GetAllAppointmentsDto } from "src/modules/appointments/appointment/common/dto";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { OrderLimitPipe } from "src/common/pipes";

@Controller("appointments/query")
export class AppointmentsQueryController {
  constructor(private readonly appointmentQueryService: AppointmentQueryService) {}

  @Get("/my-list")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @UsePipes(OrderLimitPipe)
  async getAll(
    @CurrentUser() user: ITokenUserData,
    @Query() dto: GetAllAppointmentsDto,
  ): Promise<GetAllAppointmentsOutput> {
    return await this.appointmentQueryService.getAllAppointments(user, dto);
  }

  @Get("/archived")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @UsePipes(OrderLimitPipe)
  async getArchived(
    @CurrentUser() user: ITokenUserData,
    @Query() dto: GetAllAppointmentsDto,
  ): Promise<GetAllAppointmentsOutput> {
    return await this.appointmentQueryService.getArchivedAppointments(user, dto);
  }

  @Get("/:id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async getOne(@Param() { id }: UUIDParamDto, @CurrentUser() user: ITokenUserData): Promise<Appointment> {
    return await this.appointmentQueryService.getAppointmentById(id, user);
  }

  @Get("/group/ids")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async getAllAppointmentGroupIds(@CurrentUser() user: ITokenUserData): Promise<string[]> {
    return await this.appointmentQueryService.getAppointmentsGroupIds(user);
  }

  @Get("/group/:platformId")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  async getAppointmentsByGroupId(
    @Param() { platformId }: PlatformIdParamDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<Appointment[]> {
    return await this.appointmentQueryService.getAppointmentsByGroupId(platformId, user);
  }
}
