import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { IStartRegistrationSessionData } from "src/modules/auth/common/interfaces";
import { EmailsService } from "src/modules/emails/services";
import { User } from "src/modules/users/entities";
import { UsersRegistrationService, UsersRegistrationStepsService } from "src/modules/users/services";
import { EUserRoleName } from "src/modules/users/common/enums";
import { REGISTRATION_TOKEN_QUERY_PARAM, ROLE_QUERY_PARAM } from "src/modules/auth/common/constants";
import { ConfigService } from "@nestjs/config";
import {
  EmailConfirmationTokenOutput,
  IInvitedCurrentUserDataOutput,
  IRegistrationStepsOutput,
  OneRoleLoginOutput,
  RegistrationOutput,
  RegistrationTokenOutput,
} from "src/modules/auth/common/outputs";
import { MockService } from "src/modules/mock/services";
import { MOCK_ENABLED, NUMBER_OF_DAYS_IN_WEEK } from "src/common/constants";
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
import { addDays, isBefore } from "date-fns";
import { UserRole } from "src/modules/users/entities";
import { ICurrentUserData } from "src/modules/users/common/interfaces";
import { IMessageOutput } from "src/common/outputs";
import { AuthQueryOptionsService, StagingService } from "src/modules/auth/services";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { findOneOrFailTyped, findOneTyped } from "src/common/utils";
import { HelperService } from "src/modules/helper/services";
import { SessionsService } from "src/modules/sessions/services";
import { ICurrentClientData } from "src/modules/sessions/common/interfaces";
import { EAuthErrorCodes, ERegistrationStep } from "src/modules/auth/common/enums";
import {
  TFinishRegistration,
  TFinishRegistrationUserRole,
  TGetRegistrationSteps,
  TGetRegistrationStepsUserRole,
  TInitializeOrContinueUserRegistrationUserRole,
  TStartSuperAdminRegistration,
  TVerifyRegistrationLink,
} from "src/modules/auth/common/types";
import { TokensService } from "src/modules/tokens/services";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { LokiLogger } from "src/common/logger";
import { ActivationTrackingService } from "src/modules/activation-tracking/services";
import { EMockType } from "src/modules/mock/common/enums";

@Injectable()
export class AuthRegistrationService {
  private readonly lokiLogger = new LokiLogger(AuthRegistrationService.name);
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly authQueryOptionsService: AuthQueryOptionsService,
    private readonly usersRegistrationService: UsersRegistrationService,
    private readonly usersRegistrationStepsService: UsersRegistrationStepsService,
    private readonly emailsService: EmailsService,
    private readonly configService: ConfigService,
    private readonly mockService: MockService,
    private readonly stagingService: StagingService,
    private readonly helperService: HelperService,
    private readonly sessionsService: SessionsService,
    private readonly tokensService: TokensService,
    private readonly activationTrackingService: ActivationTrackingService,
  ) {}

  public async getRegistrationSteps(
    currentUser: ICurrentUserData | IInvitedCurrentUserDataOutput,
  ): Promise<IRegistrationStepsOutput> {
    const queryOptions = this.authQueryOptionsService.getRegistrationStepsOptions(currentUser.email);
    const user = await findOneOrFailTyped<TGetRegistrationSteps>(
      currentUser.email,
      this.userRepository,
      queryOptions,
      "email",
    );

    const userRole = await this.helperService.getUserRoleByName<TGetRegistrationStepsUserRole>(user, currentUser.role);

    const isPhoneVerified = Boolean(user.phoneNumber);
    const conditionsAgreedTo = userRole.isUserAgreedToTermsAndConditions;
    const isPasswordSet = currentUser.isOauth || Boolean(user.password);

    return {
      isPasswordSet,
      isPhoneVerified,
      conditionsAgreedTo,
    };
  }

  public async startSuperAdminRegistration(
    dto: SuperAdminRegistrationDto,
    currentClient: ICurrentClientData,
  ): Promise<IMessageOutput> {
    const allowedSuperAdminEmails = this.configService.getOrThrow<string[]>("superAdminAllowedEmails");

    if (!allowedSuperAdminEmails.includes(dto.email)) {
      throw new ForbiddenException(EAuthErrorCodes.REGISTRATION_EMAIL_NOT_AUTHORIZED);
    }

    const queryOptions = this.authQueryOptionsService.startSuperAdminRegistrationOptions(dto.email);
    const existingUser = await findOneTyped<TStartSuperAdminRegistration>(this.userRepository, queryOptions);

    if (existingUser) {
      throw new ForbiddenException(EAuthErrorCodes.REGISTRATION_EMAIL_ALREADY_EXISTS);
    }

    const newUser = await this.usersRegistrationService.registerUser(dto.email, EUserRoleName.SUPER_ADMIN);

    const registrationToken = await this.tokensService.createRegistrationToken({
      email: dto.email,
      userId: newUser.id,
      userRole: EUserRoleName.SUPER_ADMIN,
      clientIPAddress: currentClient.IPAddress,
      clientUserAgent: currentClient.userAgent,
    });

    const queryParams = new URLSearchParams({
      [REGISTRATION_TOKEN_QUERY_PARAM]: registrationToken,
      [ROLE_QUERY_PARAM]: EUserRoleName.SUPER_ADMIN,
    });

    const superAdminRedirectLink = this.configService.getOrThrow<string>("frontend.superAdminRedirectLink");
    const activationLink = `${superAdminRedirectLink}?${queryParams.toString()}`;

    this.emailsService.sendSuperAdminActivationLink(dto.email, activationLink).catch((error: Error) => {
      this.lokiLogger.error(`Failed to send super admin activation link for email: ${dto.email}`, error.stack);
    });

    return { message: "Activation link was sent" };
  }

  public async startRegistration(
    dto: RegisterUserDto,
    currentClient: ICurrentClientData,
  ): Promise<EmailConfirmationTokenOutput> {
    await this.stagingService.checkEmailAccess(dto.email);

    if (MOCK_ENABLED) {
      const mock = await this.mockService.processMock({
        type: EMockType.REGISTRATION,
        data: { dto, currentClient },
      });

      if (mock.isMocked && mock.result) {
        return mock.result;
      }
    }

    await this.usersRegistrationStepsService.startRegistration(dto);

    const emailConfirmationToken = await this.tokensService.createEmailConfirmationToken({
      email: dto.email,
      userRole: dto.role,
      clientIPAddress: currentClient.IPAddress,
      clientUserAgent: currentClient.userAgent,
    });

    return { emailConfirmationToken };
  }

  public async startNewRoleRegistration(dto: SelectRoleDto, user: ITokenUserData): Promise<RegistrationTokenOutput> {
    const userRole = await this.usersRegistrationService.addNewUserRole(user.id, dto.role);

    const isOauth = !userRole.user.password;
    const registrationToken = await this.tokensService.createRegistrationToken({
      email: userRole.user.email,
      userId: user.id,
      userRole: dto.role,
      clientIPAddress: user.clientIPAddress,
      clientUserAgent: user.clientUserAgent,
      isAdditionalRole: true,
      isOauth,
    });

    return { registrationToken };
  }

  public async continueUserRegistration(registrationData: IStartRegistrationSessionData): Promise<RegistrationOutput> {
    const queryOptions = this.authQueryOptionsService.initializeOrContinueUserRegistrationOptions(
      registrationData.email,
      registrationData.userRole,
    );
    const userRole = await findOneOrFailTyped<TInitializeOrContinueUserRegistrationUserRole>(
      registrationData.email,
      this.userRoleRepository,
      queryOptions,
      "email",
    );

    const isOauth = registrationData.isOauth ?? !userRole.user.password;
    const registrationToken = await this.tokensService.createRegistrationToken({
      email: registrationData.email,
      userId: userRole.userId,
      userRole: registrationData.userRole,
      clientIPAddress: registrationData.clientIPAddress,
      clientUserAgent: registrationData.clientUserAgent,
      isOauth: isOauth,
    });
    const registrationStep = this.determineRegistrationStep(userRole);

    return { registrationToken, registrationStep };
  }

  public async verifyEmail(
    dto: VerifyEmail,
    currentUser: ICurrentUserData,
    currentClient: ICurrentClientData,
  ): Promise<RegistrationTokenOutput> {
    if (currentUser.isInvitation) {
      throw new BadRequestException(EAuthErrorCodes.REGISTRATION_EMAIL_ALREADY_VERIFIED);
    }

    const user = await this.usersRegistrationStepsService.verifyEmail(
      currentUser.email,
      dto.verificationCode,
      currentUser.role,
    );

    const registrationToken = await this.tokensService.createRegistrationToken({
      email: currentUser.email,
      userId: user.id,
      userRole: currentUser.role,
      clientIPAddress: currentClient.IPAddress,
      clientUserAgent: currentClient.userAgent,
    });

    return { registrationToken };
  }

  public async createPassword(dto: CreatePasswordDto, currentUser: ICurrentUserData): Promise<IMessageOutput> {
    if (currentUser.isOauth) {
      throw new BadRequestException(EAuthErrorCodes.REGISTRATION_PASSWORD_NOT_ALLOWED_OAUTH);
    }

    if (currentUser.isInvitation) {
      await this.verifyRegistrationLink(currentUser);
    }

    await this.usersRegistrationStepsService.createPassword(currentUser.email, dto.password);

    return { message: "Password successfully created" };
  }

  public async addPhoneNumber(
    dto: AddPhoneNumberDto,
    currentUser: ICurrentUserData | IInvitedCurrentUserDataOutput,
  ): Promise<IMessageOutput> {
    await this.usersRegistrationStepsService.addPhoneNumber(currentUser, dto);

    return { message: "Phone verification code is send" };
  }

  public async verifyPhoneNumber(
    dto: VerifyPhoneNumberDto,
    currentUser: ICurrentUserData | IInvitedCurrentUserDataOutput,
  ): Promise<IMessageOutput> {
    await this.usersRegistrationStepsService.verifyPhoneNumber(dto.verificationCode, currentUser.email);

    return { message: "Phone number is verified" };
  }

  public async agreeToConditions(
    currentUser: ICurrentUserData | IInvitedCurrentUserDataOutput,
  ): Promise<IMessageOutput> {
    if (currentUser.isInvitation) {
      await this.verifyRegistrationLink(currentUser);
    }

    await this.usersRegistrationStepsService.agreeToConditions(currentUser.email, currentUser.role);

    return { message: "You agreed to platform conditions" };
  }

  public async finishRegistration(
    dto: DeviceInfoDto,
    currentUser: ICurrentUserData | IInvitedCurrentUserDataOutput,
    currentClient: ICurrentClientData,
  ): Promise<OneRoleLoginOutput> {
    const queryOptions = this.authQueryOptionsService.finishRegistrationOptions(currentUser.email);

    const user = await findOneOrFailTyped<TFinishRegistration>(
      currentUser.email,
      this.userRepository,
      queryOptions,
      "email",
    );
    const userRole = await this.helperService.getUserRoleByName<TFinishRegistrationUserRole>(user, currentUser.role);

    this.checkRegistrationSteps(user, userRole, currentUser.isOauth);

    await this.usersRegistrationStepsService.finishRegistration(user, userRole, currentUser);

    this.activationTrackingService.checkActivationStepsEnded(userRole).catch((error: Error) => {
      this.lokiLogger.error(`checkActivationStepsEnded error, userRoleId: ${userRole.id}`, error.stack);
    });

    return await this.sessionsService.startSession({
      userId: user.id,
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

  private determineRegistrationStep(userRole: TInitializeOrContinueUserRegistrationUserRole): ERegistrationStep {
    if (!userRole.user.phoneNumber) {
      return ERegistrationStep.PHONE_VERIFICATION;
    }

    if (!userRole.isUserAgreedToTermsAndConditions) {
      return ERegistrationStep.TERMS_AND_CONDITIONS_ACCEPTANCE;
    }

    return ERegistrationStep.FINISH_REGISTRATION;
  }

  private checkRegistrationSteps(
    user: TFinishRegistration,
    userRole: TFinishRegistrationUserRole,
    isOauth?: boolean,
  ): void {
    if (userRole.isRegistrationFinished) {
      throw new ForbiddenException(EAuthErrorCodes.REGISTRATION_ALREADY_FINISHED);
    }

    if (!isOauth) {
      if (!user.isEmailVerified) {
        throw new ForbiddenException(EAuthErrorCodes.REGISTRATION_EMAIL_NOT_VERIFIED);
      }

      if (!user.password) {
        throw new ForbiddenException(EAuthErrorCodes.REGISTRATION_PASSWORD_NOT_SET);
      }
    }

    if (!user.phoneNumber) {
      throw new ForbiddenException(EAuthErrorCodes.REGISTRATION_PHONE_NOT_VERIFIED);
    }

    if (!userRole.isUserAgreedToTermsAndConditions) {
      throw new ForbiddenException(EAuthErrorCodes.REGISTRATION_TERMS_NOT_AGREED);
    }
  }

  private async verifyRegistrationLink(currentUser: ICurrentUserData): Promise<void> {
    const queryOptions = this.authQueryOptionsService.verifyRegistrationLinkOptions(
      currentUser.email,
      currentUser.role,
    );
    const userRole = await findOneOrFailTyped<TVerifyRegistrationLink>(
      currentUser.email,
      this.userRoleRepository,
      queryOptions,
      "email",
    );

    if (userRole.invitationLinkCreationDate) {
      const currentTime = new Date();
      const expirationDate = addDays(userRole.invitationLinkCreationDate, NUMBER_OF_DAYS_IN_WEEK);

      if (!userRole || isBefore(expirationDate, currentTime)) {
        throw new BadRequestException(EAuthErrorCodes.REGISTRATION_LINK_EXPIRED);
      }
    }
  }
}
