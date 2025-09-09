import { Body, Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";
import { UsersService } from "src/modules/users/services";
import { CurrentUser } from "src/common/decorators";
import { JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard } from "src/modules/auth/common/guards";
import {
  ChangeEmailDto,
  ChangePasswordDto,
  ChangePhoneNumberDto,
  VerifyEmailDto,
  VerifyPhoneNumberDto,
} from "src/modules/users/common/dto";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { IMessageOutput } from "src/common/outputs";
import { TGetCurrentUser } from "src/modules/users/common/types";

@Controller("users/me")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard, RolesGuard)
  @Get()
  async getCurrentUser(@CurrentUser() user: ITokenUserData): Promise<TGetCurrentUser> {
    return await this.usersService.getCurrentUser(user);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard)
  @Post("change-registered-phone")
  async changeRegisteredPhone(
    @Body() dto: ChangePhoneNumberDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IMessageOutput> {
    return await this.usersService.sendNewPhoneNumberVerificationCode(dto, user);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard)
  @Patch("verify-new-phone")
  async verifyNewPhone(
    @Body() dto: VerifyPhoneNumberDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<IMessageOutput> {
    return await this.usersService.verifyNewPhoneNumberCode(dto, user);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard)
  @Post("change-registered-email")
  async changeRegisteredEmail(@Body() dto: ChangeEmailDto): Promise<IMessageOutput> {
    return await this.usersService.sendNewEmailVerificationCode(dto);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard)
  @Patch("verify-new-email")
  async verifyNewEmail(@Body() dto: VerifyEmailDto, @CurrentUser() user: ITokenUserData): Promise<IMessageOutput> {
    return await this.usersService.verifyNewEmailCode(dto.email, dto.verificationCode, user.id);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard)
  @Patch("change-registered-password")
  async changeRegisteredPassword(@Body() dto: ChangePasswordDto, @CurrentUser() user: ITokenUserData): Promise<void> {
    return await this.usersService.changeRegisteredPassword(dto, user);
  }
}
