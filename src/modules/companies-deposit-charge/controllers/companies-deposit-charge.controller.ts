import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import { CurrentUser } from "src/common/decorators";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { CompaniesDepositChargeService } from "src/modules/companies-deposit-charge/services";
import { CompanyIdOptionalDto } from "src/modules/companies/common/dto";

@Controller("companies-deposit-charge")
export class CompaniesDepositChargeController {
  constructor(private readonly companiesDepositChargeService: CompaniesDepositChargeService) {}

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Post("create-request")
  async makeManualPayInCaptureAndPayOut(
    @CurrentUser() user: ITokenUserData,
    @Body() dto: CompanyIdOptionalDto,
  ): Promise<void> {
    return await this.companiesDepositChargeService.createChargeRequest(user, dto);
  }
}
