import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { CompanyActivationService } from "src/modules/account-activation/services";
import { JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { UUIDParamDto } from "src/common/dto";
import {
  FinishCompanyActivationStepsOutput,
  ICompanyActivationStepsDataOutput,
} from "src/modules/account-activation/common/outputs";
import { CurrentUser } from "src/common/decorators";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";

@Controller("company")
export class CompanyActivationController {
  constructor(private readonly companyActivationService: CompanyActivationService) {}

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Get("activation-steps")
  async getCompanyActivationSteps(
    @Query() { id }: UUIDParamDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<ICompanyActivationStepsDataOutput> {
    return await this.companyActivationService.getActivationSteps(id, user);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Post("activate")
  async activate(
    @Body() { id }: UUIDParamDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<FinishCompanyActivationStepsOutput> {
    return await this.companyActivationService.activate(id, user);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Post("deactivate")
  async deactivate(@Body() { id }: UUIDParamDto, @CurrentUser() user: ITokenUserData): Promise<void> {
    return await this.companyActivationService.deactivate(id, user);
  }
}
