import { Injectable } from "@nestjs/common";
import { JwtRequiredInfoAccessService } from "src/modules/tokens/common/libs/required-info-access-token/jwt-required-info-access.service";
import { JwtRequiredInfoRefreshService } from "src/modules/tokens/common/libs/required-info-refresh-token/jwt-required-info-refresh.service";
import { JwtActivationAccessService } from "src/modules/tokens/common/libs/activation-access-token";
import { JwtActivationRefreshService } from "src/modules/tokens/common/libs/activation-refresh-token";
import { JwtAccessService } from "src/modules/tokens/common/libs/access-token";
import { JwtRefreshService } from "src/modules/tokens/common/libs/refresh-token";
import { JwtRoleSelectionService } from "src/modules/tokens/common/libs/role-selection-token";
import { ICreateTokensData } from "src/modules/auth/common/interfaces";
import { JwtEmailConfirmationService } from "src/modules/tokens/common/libs/email-confirmation-token";
import {
  IEmailConfirmationTokenData,
  IRegistrationTokenData,
  IResetPasswordTokenData,
  IRestorationTokenData,
  IRoleSelectionTokenData,
} from "src/modules/tokens/common/interfaces";
import { JwtRegistrationService } from "src/modules/tokens/common/libs/registration-token";
import { JwtResetPasswordService } from "src/modules/tokens/common/libs/reset-password-token";
import { JwtRestorationService } from "src/modules/tokens/common/libs/restoration-token";

@Injectable()
export class TokensService {
  constructor(
    private readonly jwtRequiredInfoAccessService: JwtRequiredInfoAccessService,
    private readonly jwtRequiredInfoRefreshService: JwtRequiredInfoRefreshService,
    private readonly jwtActivationAccessService: JwtActivationAccessService,
    private readonly jwtActivationRefreshService: JwtActivationRefreshService,
    private readonly jwtAccessService: JwtAccessService,
    private readonly jwtRefreshService: JwtRefreshService,
    private readonly jwtRoleSelectionService: JwtRoleSelectionService,
    private readonly jwtEmailConfirmationService: JwtEmailConfirmationService,
    private readonly jwtRegistrationService: JwtRegistrationService,
    private readonly jwtResetPasswordService: JwtResetPasswordService,
    private readonly jwtRestorationService: JwtRestorationService,
  ) {}

  public async createRequiredInfoTokens(data: ICreateTokensData): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const accessToken = await this.jwtRequiredInfoAccessService.signAsync(data);
    const refreshToken = await this.jwtRequiredInfoRefreshService.signAsync(data);

    return { accessToken, refreshToken };
  }

  public async createActivationTokens(data: ICreateTokensData): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const accessToken = await this.jwtActivationAccessService.signAsync(data);
    const refreshToken = await this.jwtActivationRefreshService.signAsync(data);

    return { accessToken, refreshToken };
  }

  public async createFullAccessTokens(data: ICreateTokensData): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const accessToken = await this.jwtAccessService.signAsync(data);
    const refreshToken = await this.jwtRefreshService.signAsync(data);

    return { accessToken, refreshToken };
  }

  public async createRoleSelectionToken(data: IRoleSelectionTokenData): Promise<string> {
    return await this.jwtRoleSelectionService.signAsync(data);
  }

  public async createEmailConfirmationToken(data: IEmailConfirmationTokenData): Promise<string> {
    return await this.jwtEmailConfirmationService.signAsync(data);
  }

  public async createRegistrationToken(data: IRegistrationTokenData): Promise<string> {
    return await this.jwtRegistrationService.signAsync(data);
  }

  public async createRestPasswordToken(data: IResetPasswordTokenData): Promise<string> {
    return await this.jwtResetPasswordService.signAsync(data);
  }

  public async createRestorationToken(data: IRestorationTokenData): Promise<string> {
    return await this.jwtRestorationService.signAsync(data);
  }
}
