import { Body, Controller, Get, Post, UseGuards, UseInterceptors } from "@nestjs/common";
import { CurrentUser } from "src/common/decorators";
import { ICurrentUserData } from "src/modules/users/common/interfaces";
import { AccountActivationService } from "src/modules/account-activation/services";
import { TokensInterceptor } from "src/modules/tokens/common/interceptors";
import {
  JwtFullAccessGuard,
  JwtRequiredInfoOrActivationOrFullAccessGuard,
  RolesGuard,
} from "src/modules/auth/common/guards";
import { UUIDParamDto } from "src/common/dto";
import {
  FinishAccountActivationStepsOutput,
  FinishCompanyActivationStepsOutput,
  GetAccountActivationStepsOutput,
} from "src/modules/account-activation/common/outputs";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";

@Controller("users")
export class AccountActivationController {
  constructor(private readonly accountActivationService: AccountActivationService) {}

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Get("me/account-activation-steps")
  async getAccountActivationSteps(@CurrentUser() user: ITokenUserData): Promise<GetAccountActivationStepsOutput> {
    return await this.accountActivationService.retrieveRequiredAndActivationSteps(user);
  }

  @UseInterceptors(TokensInterceptor)
  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Post("me/account-activation")
  async finishAccountActivation(
    @CurrentUser() currentUser: ICurrentUserData,
  ): Promise<FinishAccountActivationStepsOutput> {
    return await this.accountActivationService.activateAccount(currentUser);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Post("activate-by-admin")
  async activate(
    @Body() { id }: UUIDParamDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<FinishCompanyActivationStepsOutput> {
    return await this.accountActivationService.activateByAdmin(id, user);
  }

  @UseGuards(JwtFullAccessGuard, RolesGuard)
  @Post("deactivate")
  async deactivate(@Body() { id }: UUIDParamDto, @CurrentUser() user: ITokenUserData): Promise<void> {
    return await this.accountActivationService.deactivate(id, user);
  }
}
