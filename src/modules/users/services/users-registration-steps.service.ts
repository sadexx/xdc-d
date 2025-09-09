import { BadRequestException, ForbiddenException, forwardRef, Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { LokiLogger } from "src/common/logger";
import { CORPORATE_SUPER_ADMIN_ROLES, MOCK_ENABLED } from "src/common/constants";
import { IMessageOutput } from "src/common/outputs";
import { findOneTyped, findOneOrFailTyped, isInRoles, generateCode } from "src/common/utils";
import { AddPhoneNumberDto, RegisterUserDto } from "src/modules/auth/common/dto";
import { IInvitedCurrentUserDataOutput } from "src/modules/auth/common/outputs";
import { TFinishRegistration, TFinishRegistrationUserRole } from "src/modules/auth/common/types";
import { AwsPinpointService } from "src/modules/aws/pinpoint/services";
import { MessagingIdentityService } from "src/modules/chime-messaging-configuration/services";
import { ECompanyStatus } from "src/modules/companies/common/enums";
import { Company } from "src/modules/companies/entities";
import { ActivationStepsTransferService } from "src/modules/data-transfer/services";
import { EmailsService } from "src/modules/emails/services";
import { MockService } from "src/modules/mock/services";
import { RedisService } from "src/modules/redis/services";
import { EUserRoleName, EAccountStatus } from "src/modules/users/common/enums";
import { ICurrentUserData, IPhoneVerification } from "src/modules/users/common/interfaces";
import {
  TVerifyEmail,
  TCreatePassword,
  TAgreeToConditions,
  TValidatePhoneNumberAvailability,
  TStartRegistration,
} from "src/modules/users/common/types";
import { User, UserRole } from "src/modules/users/entities";
import { UsersPasswordService, UsersQueryOptionsService, UsersRegistrationService } from "src/modules/users/services";
import { EMockType } from "src/modules/mock/common/enums";
import { DiscountsService } from "src/modules/discounts/services";

@Injectable()
export class UsersRegistrationStepsService {
  private readonly lokiLogger = new LokiLogger(UsersRegistrationStepsService.name);
  private readonly FRONT_END_URL: string;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @Inject(forwardRef(() => UsersRegistrationService))
    private readonly userRegistrationService: UsersRegistrationService,
    @Inject(forwardRef(() => UsersPasswordService))
    private readonly usersPasswordService: UsersPasswordService,
    private readonly usersQueryOptionsService: UsersQueryOptionsService,
    private readonly awsPinpointService: AwsPinpointService,
    private readonly redisService: RedisService,
    private readonly mockService: MockService,
    private readonly configService: ConfigService,
    private readonly messagingIdentityService: MessagingIdentityService,
    private readonly activationStepsTransferService: ActivationStepsTransferService,
    private readonly emailsService: EmailsService,
    private readonly discountsService: DiscountsService,
  ) {
    this.FRONT_END_URL = this.configService.getOrThrow<string>("frontend.uri");
  }

  public async startRegistration(dto: RegisterUserDto): Promise<void> {
    const CACHE_KEY = `verification-code:email:${dto.email}`;

    const queryOptions = this.usersQueryOptionsService.startRegistrationOptions(dto.email);
    const user = await findOneTyped<TStartRegistration>(this.userRepository, queryOptions);

    if (user) {
      const hasFinishedRegistration = user.userRoles.some(({ isRegistrationFinished }) => isRegistrationFinished);

      if (hasFinishedRegistration) {
        throw new ForbiddenException("This email is already registered. Log in to your account.");
      }
    }

    const emailConfirmationCode = generateCode();
    await this.redisService.set(CACHE_KEY, emailConfirmationCode);

    this.emailsService.sendConfirmationCode(dto.email, emailConfirmationCode).catch((error: Error) => {
      this.lokiLogger.error(`Failed to send confirmation code for email: ${dto.email}`, error.stack);
    });
  }

  public async verifyEmail(email: string, verificationCode: string, roleName: EUserRoleName): Promise<TVerifyEmail> {
    await this.verifyEmailCode(email, verificationCode);

    const queryOptions = this.usersQueryOptionsService.verifyEmailOptions(email);
    let user = await findOneTyped<TVerifyEmail>(this.userRepository, queryOptions);

    if (user) {
      const userRole = user.userRoles.find((userRole) => userRole.role.name === roleName);

      if (!userRole) {
        await this.userRegistrationService.addNewUserRole(user.id, roleName);
      }
    } else {
      user = await this.userRegistrationService.registerUser(email, roleName);
    }

    return user;
  }

  public async verifyEmailCode(email: string, receivedCode: string): Promise<void> {
    const CACHE_KEY = `verification-code:email:${email}`;

    if (MOCK_ENABLED) {
      const mock = await this.mockService.processMock({
        type: EMockType.EMAIL_VERIFY_CODE,
        data: { email },
      });

      if (mock.isMocked) {
        return;
      }
    }

    const savedCode = await this.redisService.get(CACHE_KEY);

    if (savedCode !== receivedCode) {
      throw new BadRequestException("Your code is incorrect");
    }

    await this.redisService.del(CACHE_KEY);
  }

  public async createPassword(email: string, password: string): Promise<void> {
    const queryOptions = this.usersQueryOptionsService.createPasswordOptions(email);
    const user = await findOneOrFailTyped<TCreatePassword>(email, this.userRepository, queryOptions, "email");

    if (user.password) {
      throw new ForbiddenException("Unable to add password to your account.");
    }

    await this.usersPasswordService.setPassword(user.id, password);
  }

  public async addPhoneNumber(
    currentUser: ICurrentUserData | IInvitedCurrentUserDataOutput,
    dto: AddPhoneNumberDto,
  ): Promise<IMessageOutput | void> {
    await this.validatePhoneNumberAvailability(dto.phoneNumber);
    await this.sendPhoneNumberVerificationCode(dto.phoneNumber, currentUser.email);
  }

  public async validatePhoneNumberAvailability(phoneNumber: string): Promise<void> {
    const queryOptions = this.usersQueryOptionsService.validatePhoneNumberAvailabilityOptions(phoneNumber);
    const userWithSamePhoneNumber = await findOneTyped<TValidatePhoneNumberAvailability>(
      this.userRepository,
      queryOptions,
    );

    if (userWithSamePhoneNumber) {
      throw new BadRequestException("User with this phone number already exists.");
    }
  }

  public async sendPhoneNumberVerificationCode(phoneNumber: string, email: string): Promise<void> {
    const CACHE_KEY = `verification-code:phone:${email}`;

    if (MOCK_ENABLED) {
      const mock = await this.mockService.processMock({
        type: EMockType.SEND_PHONE_NUMBER_VERIFICATION_CODE,
        data: { phoneNumber, cacheKey: CACHE_KEY },
      });

      if (mock.isMocked) {
        return;
      }
    }

    const confirmationCode = await this.awsPinpointService.sendVerificationCode(phoneNumber);
    await this.redisService.setJson(CACHE_KEY, { phoneNumber, confirmationCode });
  }

  public async verifyPhoneNumber(verificationCode: string, email: string): Promise<void> {
    const phoneNumber = await this.verifyPhoneCode(verificationCode, email);
    await this.userRepository.update({ email: email }, { phoneNumber });
  }

  public async verifyPhoneCode(verificationCode: string, email: string): Promise<string> {
    const CACHE_KEY = `verification-code:phone:${email}`;
    const redisPayload = await this.redisService.getJson<IPhoneVerification>(CACHE_KEY);

    if (!redisPayload || redisPayload.confirmationCode !== verificationCode) {
      throw new BadRequestException("Can't verify phone number.");
    }

    await this.redisService.del(CACHE_KEY);

    return redisPayload.phoneNumber;
  }

  public async agreeToConditions(email: string, roleName: EUserRoleName): Promise<void> {
    const queryOptions = this.usersQueryOptionsService.agreeToConditionsOptions(email, roleName);
    const userRole = await findOneOrFailTyped<TAgreeToConditions>(
      email,
      this.userRoleRepository,
      queryOptions,
      "email",
    );

    if (userRole.isUserAgreedToTermsAndConditions) {
      throw new BadRequestException("You have already agreed to the terms and conditions");
    }

    await this.userRoleRepository.update(userRole.id, { isUserAgreedToTermsAndConditions: true });
  }

  public async finishRegistration(
    user: TFinishRegistration,
    userRole: TFinishRegistrationUserRole,
    currentUser: ICurrentUserData | IInvitedCurrentUserDataOutput,
  ): Promise<void> {
    user.isRegistrationFinished = true;
    await this.userRepository.save(user);

    await this.userRoleRepository.update(
      { id: userRole.id },
      { isRegistrationFinished: true, accountStatus: EAccountStatus.REGISTERED, registrationDate: new Date() },
    );

    if (isInRoles(CORPORATE_SUPER_ADMIN_ROLES, currentUser.role) && user.administratedCompany) {
      await this.companyRepository.update({ id: user.administratedCompany.id }, { status: ECompanyStatus.REGISTERED });
    }

    if (currentUser.role === EUserRoleName.IND_CLIENT) {
      await this.discountsService.applyDiscountsForNewUsers(userRole);
    }

    await this.sendWelcomeEmail(user);
    await this.messagingIdentityService.createAppInstanceUser(userRole.id);

    if (user.userRoles.length > 1) {
      this.activationStepsTransferService
        .dataTransferFromExistingRolesToNewRole(user.id, userRole.role.name)
        .catch((error) => {
          this.lokiLogger.error(
            `Error in dataTransferFromExistingRolesToNewRole: ${(error as Error).message}, ${(error as Error).stack}`,
          );
        });
    }
  }

  private async sendWelcomeEmail(user: TFinishRegistration): Promise<void> {
    const loginLink = `${this.FRONT_END_URL}/login`;

    this.emailsService.sendWelcomeToLfhEmail(user.email, loginLink).catch((error: Error) => {
      this.lokiLogger.error(`Failed to send welcome email for user: ${user.id}`, error.stack);
    });
  }
}
