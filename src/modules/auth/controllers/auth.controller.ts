import { Body, Controller, Post, Req, Res, UseGuards, UseInterceptors } from "@nestjs/common";
import { Response } from "express";
import { ChangeRoleDto, LoginDto, RefreshTokensDto, SelectRoleDto } from "src/modules/auth/common/dto";
import { CurrentClient, CurrentUser } from "src/common/decorators";
import {
  JwtRefreshGuard,
  JwtRequiredInfoOrActivationOrFullAccessGuard,
  JwtRoleSelectionGuard,
} from "src/modules/auth/common/guards";
import { ClearTokensInterceptor, TokensInterceptor } from "src/modules/tokens/common/interceptors";
import { AuthService } from "src/modules/auth/services";
import {
  IRequestWithRefreshTokenOutput,
  MultipleRolesLoginOutput,
  OneRoleLoginOutput,
  RegistrationOutput,
} from "src/modules/auth/common/outputs";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { ICurrentClientData } from "src/modules/sessions/common/interfaces";
import { ICurrentUserData } from "src/modules/users/common/interfaces";
import { ETokenName } from "src/modules/tokens/common/enums";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @UseInterceptors(ClearTokensInterceptor(), TokensInterceptor)
  async login(
    @Body() dto: LoginDto,
    @CurrentClient() currentClient: ICurrentClientData,
  ): Promise<OneRoleLoginOutput | MultipleRolesLoginOutput | RegistrationOutput> {
    return await this.authService.login(dto, currentClient);
  }

  @Post("refresh-tokens")
  @UseGuards(JwtRefreshGuard)
  @UseInterceptors(TokensInterceptor)
  async refreshTokens(
    @Req() _req: IRequestWithRefreshTokenOutput,
    @Body() dto: RefreshTokensDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<OneRoleLoginOutput> {
    return await this.authService.refreshTokens(dto, user);
  }

  @UseGuards(JwtRoleSelectionGuard)
  @Post("login/select-role")
  @UseInterceptors(ClearTokensInterceptor([ETokenName.ROLE_SELECTION_TOKEN]), TokensInterceptor)
  async selectRole(
    @Body() dto: SelectRoleDto,
    @CurrentUser() currentUser: ICurrentUserData,
  ): Promise<OneRoleLoginOutput | RegistrationOutput> {
    return await this.authService.selectRole(dto, currentUser);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard)
  @Post("login/change-role")
  @UseInterceptors(TokensInterceptor)
  async changeRole(
    @Body() dto: ChangeRoleDto,
    @CurrentUser() user: ITokenUserData,
    @CurrentClient() currentClient: ICurrentClientData,
  ): Promise<OneRoleLoginOutput | RegistrationOutput> {
    return await this.authService.changeRole(dto, user, currentClient);
  }

  @Post("logout")
  @UseGuards(JwtRefreshGuard)
  @UseInterceptors(ClearTokensInterceptor([ETokenName.ACCESS_TOKEN, ETokenName.REFRESH_TOKEN]), TokensInterceptor)
  async logout(
    @Req() _req: IRequestWithRefreshTokenOutput,
    @CurrentUser() user: ITokenUserData,
    @Res() res: Response,
  ): Promise<Response> {
    const logoutResult = await this.authService.logout(user);

    return res.json(logoutResult);
  }
}
