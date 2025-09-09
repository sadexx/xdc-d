import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Query,
  Redirect,
  Res,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { Response } from "express";
import { AppleMobileGuard, AppleWebGuard, GoogleMobileGuard, GoogleWebGuard } from "src/modules/auth/common/guards";
import { TokensInterceptor } from "src/modules/tokens/common/interceptors";
import { CurrentClient, CurrentUser } from "src/common/decorators";
import { ThirdPartyAuthWebDto, ThirdPartyMobileAuthDto } from "src/modules/auth/common/dto";
import {
  IAppleWebUserDataOutput,
  IGoogleMobileUserDataOutput,
  IGoogleWebUserDataOutput,
  MultipleRolesLoginOutput,
  OneRoleLoginOutput,
  RegistrationOutput,
} from "src/modules/auth/common/outputs";
import { ICurrentClientData } from "src/modules/sessions/common/interfaces";
import { IAddPhoneData } from "src/modules/auth/common/interfaces";
import { AuthThirdPartyService } from "src/modules/auth/services";
import { IRedirectUrlOutput } from "src/common/outputs";
import { EThirdPartyAuthProvider } from "src/modules/auth/common/enums";

@Controller("auth")
export class AuthThirdPartyController {
  constructor(private readonly authThirdPartyService: AuthThirdPartyService) {}

  @Get("google")
  @Redirect("", HttpStatus.MOVED_PERMANENTLY)
  async googleAuth(
    @Query() dto: ThirdPartyAuthWebDto,
    @CurrentClient() currentClient: ICurrentClientData,
  ): Promise<IRedirectUrlOutput> {
    const destinationUrl = this.authThirdPartyService.generateOAuthUrl(
      EThirdPartyAuthProvider.GOOGLE,
      dto,
      currentClient,
    );

    return { url: destinationUrl };
  }

  @Get("google-redirect")
  @UseGuards(GoogleWebGuard)
  @Redirect("", HttpStatus.MOVED_PERMANENTLY)
  async googleRedirect(
    @CurrentUser() googleWebUserData: IGoogleWebUserDataOutput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<IRedirectUrlOutput> {
    const result = await this.authThirdPartyService.handleThirdPartyAuth(googleWebUserData);
    const destinationUrl = this.authThirdPartyService.handleWebOauthRedirect(result, res);

    return { url: destinationUrl };
  }

  @Post("google-mobile")
  @UseGuards(GoogleMobileGuard)
  @UseInterceptors(TokensInterceptor)
  async googleMobile(
    @CurrentUser() googleMobileUserData: IGoogleMobileUserDataOutput,
    @CurrentClient() currentClient: ICurrentClientData,
    @Body() dto: ThirdPartyMobileAuthDto,
  ): Promise<RegistrationOutput | OneRoleLoginOutput | MultipleRolesLoginOutput> {
    return await this.authThirdPartyService.handleThirdPartyAuth({
      email: googleMobileUserData.email,
      platform: dto.platform,
      deviceId: dto.deviceId,
      deviceToken: dto.deviceToken,
      iosVoipToken: dto.iosVoipToken,
      clientUserAgent: currentClient.userAgent,
      clientIPAddress: currentClient.IPAddress,
      role: dto.role,
    });
  }

  @Get("apple")
  @Redirect("", HttpStatus.MOVED_PERMANENTLY)
  async appleAuth(
    @Query() dto: ThirdPartyAuthWebDto,
    @CurrentClient() currentClient: ICurrentClientData,
  ): Promise<IRedirectUrlOutput> {
    const destinationUrl = this.authThirdPartyService.generateOAuthUrl(
      EThirdPartyAuthProvider.APPLE,
      dto,
      currentClient,
    );

    return { url: destinationUrl };
  }

  @Post("apple-redirect")
  @UseGuards(AppleWebGuard)
  @Redirect("", HttpStatus.MOVED_PERMANENTLY)
  async appleRedirect(
    @CurrentUser() appleWebUserData: IAppleWebUserDataOutput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<IRedirectUrlOutput> {
    const result = await this.authThirdPartyService.handleThirdPartyAuth(appleWebUserData);
    const destinationUrl = this.authThirdPartyService.handleWebOauthRedirect(result, res);

    return { url: destinationUrl };
  }

  @Post("apple-mobile")
  @UseGuards(AppleMobileGuard)
  @UseInterceptors(TokensInterceptor)
  async appleMobileLogin(
    @CurrentUser() currentUser: IAddPhoneData,
    @CurrentClient() currentClient: ICurrentClientData,
    @Body() dto: ThirdPartyMobileAuthDto,
  ): Promise<RegistrationOutput | OneRoleLoginOutput | MultipleRolesLoginOutput> {
    return await this.authThirdPartyService.handleThirdPartyAuth({
      email: currentUser.email,
      platform: dto.platform,
      deviceId: dto.deviceId,
      deviceToken: dto.deviceToken,
      iosVoipToken: dto.iosVoipToken,
      clientIPAddress: currentClient.IPAddress,
      clientUserAgent: currentClient.IPAddress,
      role: dto.role,
    });
  }
}
