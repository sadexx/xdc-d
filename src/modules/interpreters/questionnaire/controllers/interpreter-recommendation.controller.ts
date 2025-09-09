import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { CurrentUser } from "src/common/decorators";
import { UUIDParamDto } from "src/common/dto";
import { InterpreterRecommendationsService } from "src/modules/interpreters/questionnaire/services";
import {
  CreateInterpreterRecommendationDto,
  UpdateInterpreterRecommendationDto,
} from "src/modules/interpreters/questionnaire/common/dto";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { IMessageOutput } from "src/common/outputs";

@Controller("users/me")
export class InterpreterRecommendationController {
  constructor(private readonly recommendationService: InterpreterRecommendationsService) {}

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Post("recommendations")
  async createRecommendation(
    @Body() dto: CreateInterpreterRecommendationDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IMessageOutput> {
    return await this.recommendationService.createRecommendation(dto, user);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Patch("recommendations/:id")
  async updateRecommendation(
    @Param() { id }: UUIDParamDto,
    @Body() dto: UpdateInterpreterRecommendationDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IMessageOutput> {
    return await this.recommendationService.updateRecommendation(id, dto, user);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete("recommendations/:id")
  async removeRecommendation(@Param() { id }: UUIDParamDto, @CurrentUser() user: ITokenUserData): Promise<void> {
    return await this.recommendationService.deleteRecommendation(id, user);
  }
}
