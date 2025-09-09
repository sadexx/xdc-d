import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { SetDefaultPayOutMethodDto } from "src/modules/payment-information/common/dto";
import { JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { CurrentUser } from "src/common/decorators";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { GeneralPaymentInformationService } from "src/modules/payment-information/services";
import { IGetPaymentInfoOutput } from "src/modules/payment-information/common/outputs";

@Controller("payment-information")
export class GeneralPaymentInformationController {
  constructor(private readonly generalPaymentInformationService: GeneralPaymentInformationService) {}

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Post("set-default-payment-method")
  async setDefaultPaymentMethod(
    @CurrentUser() user: ITokenUserData,
    @Body() dto: SetDefaultPayOutMethodDto,
  ): Promise<void> {
    return await this.generalPaymentInformationService.setDefaultPaymentMethod(user, dto);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Get("get-payment-info")
  async getPaymentInfo(@CurrentUser() user: ITokenUserData): Promise<IGetPaymentInfoOutput> {
    return await this.generalPaymentInformationService.getPaymentInfo(user);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard)
  @Get("mock-payment-info")
  async mockPaymentInfo(@CurrentUser() user: ITokenUserData): Promise<void> {
    return await this.generalPaymentInformationService.mockPaymentInfo(user);
  }
}
