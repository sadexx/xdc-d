import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { UsersService } from "src/modules/users/services";
import { SessionsService } from "src/modules/sessions/services";
import { MultipleRolesLoginOutput, OneRoleLoginOutput, RegistrationOutput } from "src/modules/auth/common/outputs";
import { ChangeRoleDto, LoginDto, RefreshTokensDto, SelectRoleDto } from "src/modules/auth/common/dto";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User, UserRole } from "src/modules/users/entities";
import { findOneOrFailTyped, findOneTyped } from "src/common/utils";
import { ICurrentClientData, IStartSessionData } from "src/modules/sessions/common/interfaces";
import { TokensService } from "src/modules/tokens/services";
import { AuthQueryOptionsService, AuthRegistrationService } from "src/modules/auth/services";
import {
  THandleRoleBasedLogin,
  TRefreshTokens,
  TSelectRole,
  TVerifyUserAuthorization,
} from "src/modules/auth/common/types";
import { compare } from "bcrypt";
import { Session } from "src/modules/sessions/entities";
import { ICurrentUserData } from "src/modules/users/common/interfaces";
import { EAuthErrorCodes } from "src/modules/auth/common/enums";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(Session)
    private readonly sessionsRepository: Repository<Session>,
    private readonly authQueryOptionsService: AuthQueryOptionsService,
    private readonly authRegistrationService: AuthRegistrationService,
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
    private readonly tokensService: TokensService,
  ) {}

  public async login(
    dto: LoginDto,
    currentClient: ICurrentClientData,
  ): Promise<OneRoleLoginOutput | MultipleRolesLoginOutput | RegistrationOutput> {
    const user = await this.verifyUserCredentials(dto);

    if (user.userRoles.length === 1) {
      const [userRole] = user.userRoles;

      if (!userRole.isRegistrationFinished) {
        return this.authRegistrationService.continueUserRegistration({
          email: user.email,
          userId: user.id,
          userRole: userRole.role.name,
          clientIPAddress: currentClient.IPAddress,
          clientUserAgent: currentClient.userAgent,
        });
      }
    }

    return await this.handleRoleBasedLogin(user, {
      platform: dto.platform,
      deviceId: dto.deviceId,
      deviceToken: dto.deviceToken,
      iosVoipToken: dto.iosVoipToken,
      userAgent: currentClient.userAgent,
      IPAddress: currentClient.IPAddress,
    });
  }

  public async refreshTokens(dto: RefreshTokensDto, user: ITokenUserData): Promise<OneRoleLoginOutput> {
    const queryOptions = this.authQueryOptionsService.refreshTokensOptions(user.id, user.role);
    const userRole = await findOneOrFailTyped<TRefreshTokens>(user.id, this.userRoleRepository, queryOptions, "userId");

    await this.usersService.isUserNotDeletedAndNotDeactivated(userRole);

    return await this.sessionsService.updateActiveSession({
      userId: userRole.userId,
      userRoleId: userRole.id,
      userRole: user.role,
      platform: dto.platform,
      deviceId: dto.deviceId,
      deviceToken: dto.deviceToken,
      iosVoipToken: dto.iosVoipToken,
      clientIPAddress: user.clientIPAddress,
      clientUserAgent: user.clientUserAgent,
      isActive: userRole.isActive,
      isRequiredInfoFulfilled: userRole.isRequiredInfoFulfilled,
    });
  }

  public async selectRole(
    dto: SelectRoleDto,
    currentUser: ICurrentUserData,
  ): Promise<OneRoleLoginOutput | RegistrationOutput> {
    if (
      !currentUser.platform ||
      !currentUser.deviceId ||
      !currentUser.clientUserAgent ||
      !currentUser.clientIPAddress
    ) {
      throw new BadRequestException(EAuthErrorCodes.AUTHORIZATION_INVALID_REQUEST);
    }

    const queryOptions = this.authQueryOptionsService.selectRoleOptions(currentUser.email, dto.role);
    const userRole = await findOneOrFailTyped<TSelectRole>(
      currentUser.email,
      this.userRoleRepository,
      queryOptions,
      "email",
    );

    return await this.handleRoleSelectionAuthentication(userRole, {
      userId: userRole.userId,
      userRoleId: userRole.id,
      userRole: userRole.role.name,
      isRequiredInfoFulfilled: userRole.isRequiredInfoFulfilled,
      isActive: userRole.isActive,
      platform: currentUser.platform,
      deviceId: currentUser.deviceId,
      deviceToken: currentUser.deviceToken ?? null,
      iosVoipToken: currentUser.iosVoipToken ?? null,
      clientIPAddress: currentUser.clientIPAddress,
      clientUserAgent: currentUser.clientUserAgent,
    });
  }

  public async changeRole(
    dto: ChangeRoleDto,
    user: ITokenUserData,
    currentClient: ICurrentClientData,
  ): Promise<OneRoleLoginOutput | RegistrationOutput> {
    if (dto.role === user.role) {
      throw new BadRequestException(EAuthErrorCodes.AUTHORIZATION_ROLE_ALREADY_ACTIVE);
    }

    const queryOptions = this.authQueryOptionsService.changeRoleOptions(user.id, dto.role);
    const userRole = await findOneOrFailTyped<TSelectRole>(user.id, this.userRoleRepository, queryOptions, "userId");

    return await this.handleRoleSelectionAuthentication(userRole, {
      userId: userRole.userId,
      userRoleId: userRole.id,
      userRole: userRole.role.name,
      isRequiredInfoFulfilled: userRole.isRequiredInfoFulfilled,
      isActive: userRole.isActive,
      platform: dto.platform,
      deviceId: dto.deviceId,
      deviceToken: dto.deviceToken,
      iosVoipToken: dto.iosVoipToken,
      clientIPAddress: currentClient.IPAddress,
      clientUserAgent: currentClient.userAgent,
    });
  }

  public async logout(user: ITokenUserData): Promise<OneRoleLoginOutput> {
    await this.sessionsRepository.delete({ userRoleId: user.userRoleId });

    return {
      accessToken: "",
      refreshToken: "",
    };
  }

  public async handleRoleBasedLogin(
    user: THandleRoleBasedLogin,
    currentClient: ICurrentClientData,
  ): Promise<OneRoleLoginOutput | MultipleRolesLoginOutput> {
    if (user.userRoles.length === 1) {
      return await this.loginWithOneRole(user, currentClient);
    } else {
      return await this.loginWithMultipleRoles(user, currentClient);
    }
  }

  private async loginWithOneRole(
    user: THandleRoleBasedLogin,
    currentClient: ICurrentClientData,
  ): Promise<OneRoleLoginOutput> {
    const [userRole] = user.userRoles;
    await this.usersService.isUserNotDeletedAndNotDeactivated(userRole);

    return await this.sessionsService.startSession({
      userId: user.id,
      userRoleId: userRole.id,
      userRole: userRole.role.name,
      isActive: userRole.isActive,
      isRequiredInfoFulfilled: userRole.isRequiredInfoFulfilled,
      platform: currentClient.platform,
      deviceId: currentClient.deviceId,
      deviceToken: currentClient.deviceToken,
      iosVoipToken: currentClient.iosVoipToken,
      clientUserAgent: currentClient.userAgent,
      clientIPAddress: currentClient.IPAddress,
    });
  }

  private async loginWithMultipleRoles(
    user: THandleRoleBasedLogin,
    currentClient: ICurrentClientData,
  ): Promise<MultipleRolesLoginOutput> {
    const roleSelectionToken = await this.tokensService.createRoleSelectionToken({
      email: user.email,
      platform: currentClient.platform,
      deviceId: currentClient.deviceId,
      deviceToken: currentClient.deviceToken,
      iosVoipToken: currentClient.iosVoipToken,
      clientIPAddress: currentClient.IPAddress,
      clientUserAgent: currentClient.userAgent,
    });

    return {
      availableRoles: user.userRoles.map(({ role }) => role.name),
      roleSelectionToken: roleSelectionToken,
    };
  }

  private async verifyUserCredentials(dto: LoginDto): Promise<TVerifyUserAuthorization> {
    const queryOptions = this.authQueryOptionsService.verifyUserAuthorizationOptions(dto.identification);
    const user = await findOneTyped<TVerifyUserAuthorization>(this.userRepository, queryOptions);

    if (!user || !user.password) {
      throw new NotFoundException(EAuthErrorCodes.AUTHORIZATION_INVALID_CREDENTIALS);
    }

    const isPasswordCorrect = await compare(dto.password, user.password);

    if (!isPasswordCorrect) {
      throw new NotFoundException(EAuthErrorCodes.AUTHORIZATION_INVALID_CREDENTIALS);
    }

    return user;
  }

  private async handleRoleSelectionAuthentication(
    userRole: TSelectRole,
    startSessionData: IStartSessionData,
  ): Promise<OneRoleLoginOutput | RegistrationOutput> {
    if (!userRole.isRegistrationFinished) {
      return await this.authRegistrationService.continueUserRegistration({
        email: userRole.user.email,
        userId: userRole.user.id,
        userRole: userRole.role.name,
        clientIPAddress: startSessionData.clientIPAddress,
        clientUserAgent: startSessionData.clientUserAgent,
      });
    }

    await this.usersService.isUserNotDeletedAndNotDeactivated(userRole);

    return await this.sessionsService.startSession({
      userId: userRole.userId,
      userRoleId: userRole.id,
      userRole: userRole.role.name,
      isActive: userRole.isActive,
      isRequiredInfoFulfilled: userRole.isRequiredInfoFulfilled,
      platform: startSessionData.platform,
      deviceId: startSessionData.deviceId,
      deviceToken: startSessionData.deviceToken,
      iosVoipToken: startSessionData.iosVoipToken,
      clientIPAddress: startSessionData.clientIPAddress,
      clientUserAgent: startSessionData.clientUserAgent,
    });
  }
}
