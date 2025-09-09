import { Controller, Delete, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "src/common/decorators";
import {
  JwtFullAccessGuard,
  JwtRequiredInfoOrActivationOrFullAccessGuard,
  RolesGuard,
} from "src/modules/auth/common/guards";
import { SumSubService } from "src/modules/sumsub/services";
import { GetSumSubAccessTokenQueryDto, GetSumSubQueryDto } from "src/modules/sumsub/common/dto";
import { SumSubCheck } from "src/modules/sumsub/entities";
import { OptionalUUIDParamDto, UUIDParamDto } from "src/common/dto";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { GetUserAccessTokenOutput } from "src/modules/sumsub/common/outputs";

@Controller("sumsub")
export class SumSubController {
  constructor(private readonly sumSubService: SumSubService) {}

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Get("access-token")
  async getAccessToken(
    @CurrentUser() user: ITokenUserData,
    @Query()
    dto: GetSumSubAccessTokenQueryDto,
  ): Promise<GetUserAccessTokenOutput> {
    return this.sumSubService.getUserAccessToken(user, dto);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Get("all-status-checks")
  async getAll(@Query() dto: GetSumSubQueryDto): Promise<SumSubCheck[]> {
    return this.sumSubService.getAll(dto);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Get("user-status")
  async getUserStatus(
    @CurrentUser() user: ITokenUserData,
    @Query() dto: OptionalUUIDParamDto,
  ): Promise<SumSubCheck | null> {
    return this.sumSubService.getUserStatus(user, dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete()
  async removeSumSubCheck(@Query() { id }: UUIDParamDto): Promise<void> {
    return this.sumSubService.removeSumSubCheck(id);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard)
  @Post("mock")
  async mockSumSub(@CurrentUser() user: ITokenUserData): Promise<{
    id: string;
  }> {
    return this.sumSubService.mockSumSub(user);
  }
}
