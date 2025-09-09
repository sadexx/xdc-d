import { Controller, Get, Param, Query, UseGuards, UsePipes } from "@nestjs/common";
import { AppointmentOrderQueryService } from "src/modules/appointment-orders/appointment-order/services";
import { CurrentUser } from "src/common/decorators";
import { PlatformIdParamDto, UUIDParamDto } from "src/common/dto";
import { JwtFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import {
  GetAllAppointmentOrdersDto,
  GetAllListInterpretersDto,
} from "src/modules/appointment-orders/appointment-order/common/dto";
import {
  IAllTypeAppointmentOrdersOutput,
  IAppointmentOrderByIdOutput,
  IAppointmentOrderGroupByIdOutput,
} from "src/modules/appointment-orders/appointment-order/common/outputs";
import { GetAllListInterpretersOutput } from "src/modules/appointment-orders/appointment-order/common/outputs";
import { OrderLimitPipe } from "src/common/pipes";

@Controller("appointment-orders/query")
export class AppointmentOrdersQueryController {
  constructor(private readonly appointmentOrderQueryService: AppointmentOrderQueryService) {}

  @Get("/company")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @UsePipes(OrderLimitPipe)
  public async getCompanyAppointmentOrders(
    @CurrentUser() user: ITokenUserData,
    @Query() dto: GetAllAppointmentOrdersDto,
  ): Promise<IAllTypeAppointmentOrdersOutput> {
    return await this.appointmentOrderQueryService.getCompanyAppointmentOrders(user, dto);
  }

  @Get("/matched")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @UsePipes(OrderLimitPipe)
  public async getInterpreterNewOrders(
    @CurrentUser() user: ITokenUserData,
    @Query() dto: GetAllAppointmentOrdersDto,
  ): Promise<IAllTypeAppointmentOrdersOutput> {
    return await this.appointmentOrderQueryService.getInterpreterMatchedAppointmentOrdersByRole(user, dto);
  }

  @Get("/rejected")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @UsePipes(OrderLimitPipe)
  public async getInterpreterRejectedOrders(
    @CurrentUser() user: ITokenUserData,
    @Query() dto: GetAllAppointmentOrdersDto,
  ): Promise<IAllTypeAppointmentOrdersOutput> {
    return await this.appointmentOrderQueryService.getInterpreterRejectedAppointmentOrdersByRole(user, dto);
  }

  @Get(":id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  public async getAppointmentOrderById(
    @Param() { id }: UUIDParamDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IAppointmentOrderByIdOutput> {
    return await this.appointmentOrderQueryService.getAppointmentOrderById(id, user);
  }

  @Get("/group/:id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  public async getOrdersInGroupById(
    @Param() { id }: UUIDParamDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IAppointmentOrderGroupByIdOutput> {
    return await this.appointmentOrderQueryService.getOrdersInGroupById(id, user);
  }

  @Get("/list-of-interpreters-received-order/:id")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  public async getListOfInterpretersReceivedOrder(
    @Param() { id }: UUIDParamDto,
    @Query() dto: GetAllListInterpretersDto,
  ): Promise<GetAllListInterpretersOutput> {
    return await this.appointmentOrderQueryService.getListOfInterpretersReceivedOrder(id, dto);
  }

  @Get("/group/list-of-interpreters-received-order/:platformId")
  @UseGuards(JwtFullAccessGuard, RolesGuard)
  public async getListOfInterpretersReceivedOrderGroup(
    @Param() { platformId }: PlatformIdParamDto,
    @Query() dto: GetAllListInterpretersDto,
  ): Promise<GetAllListInterpretersOutput> {
    return await this.appointmentOrderQueryService.getListOfInterpretersReceivedOrderGroup(platformId, dto);
  }
}
