import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  AuthQueryOptionsService,
  AuthRegistrationService,
  AuthService,
  StagingService,
} from "src/modules/auth/services";
import { IThirdPartyAuthData } from "src/modules/auth/common/interfaces";
import {
  IThirdPartyAuthWebStateOutput,
  MultipleRolesLoginOutput,
  OneRoleLoginOutput,
  RegistrationOutput,
} from "src/modules/auth/common/outputs";
import { findOneTyped } from "src/common/utils";
import { User } from "src/modules/users/entities";
import { THandleThirdPartyAuth } from "src/modules/auth/common/types";
import { ConfigService } from "@nestjs/config";
import { frontendRegistrationStepRoutes, thirdPartyAuthProviderConfig } from "src/modules/auth/common/constants";
import { Response } from "express";
import { ETokenName } from "src/modules/tokens/common/enums";
import { EThirdPartyAuthProvider } from "src/modules/auth/common/enums";
import { ThirdPartyAuthWebDto } from "src/modules/auth/common/dto";
import { ICurrentClientData } from "src/modules/sessions/common/interfaces";
import { UsersRegistrationService } from "src/modules/users/services";

@Injectable()
export class AuthThirdPartyService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly authQueryOptionsService: AuthQueryOptionsService,
    private readonly authRegistrationService: AuthRegistrationService,
    private readonly authService: AuthService,
    private readonly usersRegistrationService: UsersRegistrationService,
    private readonly stagingService: StagingService,
    private readonly configService: ConfigService,
  ) {}

  public async handleThirdPartyAuth(
    thirdPartyAuthData: IThirdPartyAuthData,
  ): Promise<RegistrationOutput | OneRoleLoginOutput | MultipleRolesLoginOutput> {
    await this.stagingService.checkEmailAccess(thirdPartyAuthData.email);

    const queryOptions = this.authQueryOptionsService.handleThirdPartyAuthOptions(thirdPartyAuthData.email);
    let user = await findOneTyped<THandleThirdPartyAuth>(this.userRepository, queryOptions);

    if (user && user.isRegistrationFinished) {
      return await this.authService.handleRoleBasedLogin(user, {
        platform: thirdPartyAuthData.platform,
        deviceId: thirdPartyAuthData.deviceId,
        deviceToken: thirdPartyAuthData.deviceToken,
        iosVoipToken: thirdPartyAuthData.iosVoipToken,
        IPAddress: thirdPartyAuthData.clientIPAddress,
        userAgent: thirdPartyAuthData.clientUserAgent,
      });
    }

    const roleName = thirdPartyAuthData.role ?? user?.userRoles?.[0]?.role.name;

    if (!roleName) {
      throw new BadRequestException("Unable to determine user role for registration.");
    }

    if (!user) {
      user = await this.usersRegistrationService.registerUser(thirdPartyAuthData.email, roleName);
    }

    return await this.authRegistrationService.continueUserRegistration({
      email: thirdPartyAuthData.email,
      userId: user.id,
      clientIPAddress: thirdPartyAuthData.clientIPAddress,
      clientUserAgent: thirdPartyAuthData.clientUserAgent,
      userRole: roleName,
      isOauth: true,
    });
  }

  public generateOAuthUrl(
    thirdPartyAuthProvider: EThirdPartyAuthProvider,
    dto: ThirdPartyAuthWebDto,
    currentClient: ICurrentClientData,
  ): string {
    const authRedirection = this.configService.getOrThrow<string>(`${thirdPartyAuthProvider}Auth.callbackURL`);
    const clientId = this.configService.getOrThrow<string>(`${thirdPartyAuthProvider}Auth.clientID`);
    const providerConfig = thirdPartyAuthProviderConfig[thirdPartyAuthProvider];

    const state = JSON.stringify({
      role: dto.role,
      ...currentClient,
      platform: dto.platform,
      deviceId: dto.deviceId,
      deviceToken: dto.deviceToken,
      iosVoipToken: dto.iosVoipToken,
    } as IThirdPartyAuthWebStateOutput);

    const searchParams = new URLSearchParams({
      client_id: clientId,
      redirect_uri: authRedirection,
      response_type: providerConfig.responseType,
      scope: providerConfig.scope,
      state,
    });

    if (providerConfig.responseMode) {
      searchParams.append("response_mode", providerConfig.responseMode);
    }

    return `${providerConfig.authURL}?${searchParams.toString()}`;
  }

  public handleWebOauthRedirect(
    thirdPartyAuthResult: RegistrationOutput | OneRoleLoginOutput | MultipleRolesLoginOutput,
    res: Response,
  ): string {
    const redirectUri = this.configService.getOrThrow<string>("frontend.uri");

    if (ETokenName.REGISTRATION_TOKEN in thirdPartyAuthResult) {
      res.cookie(ETokenName.REGISTRATION_TOKEN, thirdPartyAuthResult.registrationToken);

      return `${redirectUri}${frontendRegistrationStepRoutes[thirdPartyAuthResult.registrationStep]}`;
    }

    if (ETokenName.ROLE_SELECTION_TOKEN in thirdPartyAuthResult) {
      res.cookie(ETokenName.ROLE_SELECTION_TOKEN, thirdPartyAuthResult.roleSelectionToken);
      const availableRoles = thirdPartyAuthResult.availableRoles;
      const rolesParams = availableRoles.map((role) => `roles=${encodeURIComponent(role)}`).join("&");

      return `${redirectUri}/login/role-selection?${rolesParams}`;
    }

    res.cookie(ETokenName.ACCESS_TOKEN, thirdPartyAuthResult.accessToken);
    res.cookie(ETokenName.REFRESH_TOKEN, thirdPartyAuthResult.refreshToken);

    return `${redirectUri}/login?withTokens=true`;
  }
}
