import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, UsePipes } from "@nestjs/common";
import { AdminPaymentsService, AdminService } from "src/modules/admin/services";
import {
  GetUserDocumentsDto,
  GetUserInterpreterProfileDto,
  GetUserPaymentsDto,
  GetUsersDto,
  GetUserStepsDto,
  MarkPaymentsInvoicedDto,
  UpdatePaymentStatusDto,
} from "src/modules/admin/common/dto";
import { InterpreterProfile } from "src/modules/interpreters/profile/entities";
import { JwtFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { CurrentUser } from "src/common/decorators";
import {
  GetUserDocumentsOutput,
  GetUserProfileOutput,
  GetUsersOutput,
  IGetUserPaymentResponseOutput,
} from "src/modules/admin/common/output";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { OrderLimitPipe } from "src/common/pipes";
import { UUIDParamDto } from "src/common/dto";
import { IAccountRequiredStepsDataOutput } from "src/modules/account-activation/common/outputs";

@Controller("admin")
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly adminPaymentsService: AdminPaymentsService,
  ) {}

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @UsePipes(OrderLimitPipe)
  @Get("users")
  async getUsers(@Query() dto: GetUsersDto): Promise<GetUsersOutput> {
    return this.adminService.getUsers(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("user-documents")
  async getUserDocuments(@Query() dto: GetUserDocumentsDto): Promise<GetUserDocumentsOutput> {
    return this.adminService.getUserDocuments(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("user-profile/:id")
  async getUserProfile(@Param() { id }: UUIDParamDto): Promise<GetUserProfileOutput> {
    return this.adminService.getUserProfile(id);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("user-steps")
  async getUserSteps(
    @Query() dto: GetUserStepsDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IAccountRequiredStepsDataOutput> {
    return this.adminService.getUserSteps(dto, user);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Get("interpreter-profile")
  async getUserInterpreterProfile(@Query() dto: GetUserInterpreterProfileDto): Promise<InterpreterProfile | null> {
    return this.adminService.getUserInterpreterProfile(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @UsePipes(OrderLimitPipe)
  @Get("payments")
  async getUserPayments(@Query() dto: GetUserPaymentsDto): Promise<IGetUserPaymentResponseOutput> {
    return this.adminPaymentsService.getUserPayments(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Patch("payments/status/:id")
  async updatePaymentStatus(@Param() { id }: UUIDParamDto, @Body() dto: UpdatePaymentStatusDto): Promise<void> {
    await this.adminPaymentsService.updatePaymentStatus(id, dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Patch("payments/invoiced")
  async markPaymentsInvoiced(@Body() dto: MarkPaymentsInvoicedDto): Promise<void> {
    await this.adminPaymentsService.markPaymentsInvoiced(dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Post("payments/corporate-receipt")
  async generateCorporatePostPaymentReceipt(@Body() dto: MarkPaymentsInvoicedDto): Promise<void> {
    await this.adminPaymentsService.generateCorporatePostPaymentReceipt(dto);
  }
}
