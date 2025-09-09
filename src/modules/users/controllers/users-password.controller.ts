import { Body, Controller, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtResetPasswordGuard } from "src/modules/auth/common/guards";
import { CurrentClient, CurrentUser } from "src/common/decorators";
import { ResetPasswordDto, StartPasswordResetDto, VerifyPasswordResetCodeDto } from "src/modules/users/common/dto";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { UsersPasswordService } from "src/modules/users/services";
import { ICurrentClientData } from "src/modules/sessions/common/interfaces";

@Controller("users")
export class UsersPasswordController {
  constructor(private readonly usersPasswordService: UsersPasswordService) {}

  @Post("password-reset-requests")
  async sendRequestToChangePassword(
    @Body() dto: StartPasswordResetDto,
    @CurrentClient() currentClient: ICurrentClientData,
  ): Promise<void> {
    await this.usersPasswordService.sendRequestToChangePassword(dto, currentClient);
  }

  @Post("password-reset-requests/verification")
  async verifyPasswordResetPhoneCode(
    @Body() dto: VerifyPasswordResetCodeDto,
    @CurrentClient() currentClient: ICurrentClientData,
  ): Promise<string> {
    return this.usersPasswordService.verifyPasswordResetPhoneCode(dto, currentClient);
  }

  @Patch("password")
  @UseGuards(JwtResetPasswordGuard)
  async setPassword(@Body() dto: ResetPasswordDto, @CurrentUser() user: ITokenUserData): Promise<void> {
    return this.usersPasswordService.setPassword(user.id, dto.newPassword);
  }
}
