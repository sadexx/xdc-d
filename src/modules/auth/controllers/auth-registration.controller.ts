import { Body, Controller, Get, Post, UseGuards, UseInterceptors } from "@nestjs/common";
import {
  AddPhoneNumberDto,
  CreatePasswordDto,
  DeviceInfoDto,
  RegisterUserDto,
  SelectRoleDto,
  SuperAdminRegistrationDto,
  VerifyEmail,
  VerifyPhoneNumberDto,
} from "src/modules/auth/common/dto";
import { CurrentClient, CurrentUser } from "src/common/decorators";
import {
  JwtEmailConfirmationGuard,
  JwtRegistrationGuard,
  JwtRequiredInfoOrActivationOrFullAccessGuard,
} from "src/modules/auth/common/guards";
import { AuthRegistrationService } from "src/modules/auth/services";
import { ClearTokensInterceptor, TokensInterceptor } from "src/modules/tokens/common/interceptors";
import { ICurrentUserData } from "src/modules/users/common/interfaces";
import {
  EmailConfirmationTokenOutput,
  IInvitedCurrentUserDataOutput,
  IRegistrationStepsOutput,
  OneRoleLoginOutput,
  RegistrationTokenOutput,
} from "src/modules/auth/common/outputs";
import { ICurrentClientData } from "src/modules/sessions/common/interfaces";
import { IMessageOutput } from "src/common/outputs";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { ETokenName } from "src/modules/tokens/common/enums";

@Controller("registration")
export class AuthRegistrationController {
  constructor(private readonly authRegistrationService: AuthRegistrationService) {}

  @UseGuards(JwtRegistrationGuard)
  @Get("steps")
  async getRegistrationSteps(
    @CurrentUser() user: ICurrentUserData | IInvitedCurrentUserDataOutput,
  ): Promise<IRegistrationStepsOutput> {
    return this.authRegistrationService.getRegistrationSteps(user);
  }

  @Post("super-admin-registration")
  async startSuperAdminRegistration(
    @Body() dto: SuperAdminRegistrationDto,
    @CurrentClient() currentClient: ICurrentClientData,
  ): Promise<IMessageOutput> {
    return this.authRegistrationService.startSuperAdminRegistration(dto, currentClient);
  }

  @Post("start-registration")
  @UseInterceptors(TokensInterceptor)
  async startRegistration(
    @Body() dto: RegisterUserDto,
    @CurrentClient() currentClient: ICurrentClientData,
  ): Promise<EmailConfirmationTokenOutput> {
    return await this.authRegistrationService.startRegistration(dto, currentClient);
  }

  @UseGuards(JwtRequiredInfoOrActivationOrFullAccessGuard)
  @Post("start-new-role-registration")
  @UseInterceptors(TokensInterceptor)
  async startNewRoleRegistration(
    @Body() dto: SelectRoleDto,
    @CurrentUser() user: ITokenUserData,
  ): Promise<RegistrationTokenOutput> {
    return await this.authRegistrationService.startNewRoleRegistration(dto, user);
  }

  @UseGuards(JwtEmailConfirmationGuard)
  @Post("verify-email")
  @UseInterceptors(ClearTokensInterceptor([ETokenName.EMAIL_CONFIRMATION_TOKEN]), TokensInterceptor)
  async verifyEmail(
    @Body() dto: VerifyEmail,
    @CurrentUser() currentUser: ICurrentUserData,
    @CurrentClient() currentClient: ICurrentClientData,
  ): Promise<RegistrationTokenOutput> {
    return await this.authRegistrationService.verifyEmail(dto, currentUser, currentClient);
  }

  @UseGuards(JwtRegistrationGuard)
  @Post("create-password")
  async createPassword(
    @Body() dto: CreatePasswordDto,
    @CurrentUser() currentUser: ICurrentUserData | IInvitedCurrentUserDataOutput,
  ): Promise<IMessageOutput> {
    return this.authRegistrationService.createPassword(dto, currentUser);
  }

  @UseGuards(JwtRegistrationGuard)
  @Post("add-phone")
  async addPhone(
    @Body() dto: AddPhoneNumberDto,
    @CurrentUser() currentUser: ICurrentUserData | IInvitedCurrentUserDataOutput,
  ): Promise<IMessageOutput> {
    return this.authRegistrationService.addPhoneNumber(dto, currentUser);
  }

  @UseGuards(JwtRegistrationGuard)
  @Post("verify-phone")
  async verifyPhone(
    @Body() dto: VerifyPhoneNumberDto,
    @CurrentUser() currentUser: ICurrentUserData | IInvitedCurrentUserDataOutput,
  ): Promise<IMessageOutput> {
    return this.authRegistrationService.verifyPhoneNumber(dto, currentUser);
  }

  @UseGuards(JwtRegistrationGuard)
  @Post("conditions-agreement")
  async conditionsAgreement(
    @CurrentUser() currentUser: ICurrentUserData | IInvitedCurrentUserDataOutput,
  ): Promise<IMessageOutput> {
    return this.authRegistrationService.agreeToConditions(currentUser);
  }

  @UseGuards(JwtRegistrationGuard)
  @Post("finish-registration")
  @UseInterceptors(ClearTokensInterceptor([ETokenName.REGISTRATION_TOKEN]), TokensInterceptor)
  async finishRegistration(
    @Body() dto: DeviceInfoDto,
    @CurrentUser() currentUser: ICurrentUserData | IInvitedCurrentUserDataOutput,
    @CurrentClient() currentClient: ICurrentClientData,
  ): Promise<OneRoleLoginOutput> {
    return await this.authRegistrationService.finishRegistration(dto, currentUser, currentClient);
  }
}
