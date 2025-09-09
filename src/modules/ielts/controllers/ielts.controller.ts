import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from "@nestjs/common";
import {
  JwtFullAccessGuard,
  JwtRequiredInfoOrActivationOrFullAccessGuard,
  RolesGuard,
} from "src/modules/auth/common/guards";
import { CurrentUser } from "src/common/decorators";
import { IeltsService } from "src/modules/ielts/services";
import { IeltsVerificationDto } from "src/modules/ielts/common/dto";
import { IeltsCheck } from "src/modules/ielts/entities";
import { OptionalUUIDParamDto, UUIDParamDto } from "src/common/dto";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { IIeltsVerificationOutput } from "src/modules/ielts/common/outputs";

@Controller("ielts")
export class IeltsController {
  constructor(private readonly ieltsService: IeltsService) {}

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Post("verification")
  async ieltsVerification(
    @Body() dto: IeltsVerificationDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IIeltsVerificationOutput> {
    return this.ieltsService.ieltsVerification(dto, user);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Get("get-request")
  async getRequest(
    @CurrentUser() user: ITokenUserData,
    @Query() dto: OptionalUUIDParamDto,
  ): Promise<IeltsCheck | null> {
    return this.ieltsService.getIeltsRequest(user, dto);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete()
  async removeRequest(@Query() { id }: UUIDParamDto): Promise<void> {
    return this.ieltsService.removeIeltsRequest(id);
  }
}
