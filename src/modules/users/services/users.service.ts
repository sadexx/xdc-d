import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { compare } from "bcrypt";
import { User } from "src/modules/users/entities";
import { EAccountStatus, EUsersErrorCodes } from "src/modules/users/common/enums";
import { EmailsService } from "src/modules/emails/services";
import { ChangeEmailDto, ChangePasswordDto, VerifyPhoneNumberDto } from "src/modules/users/common/dto";
import { COMPANY_LFH_FULL_NAME } from "src/modules/companies/common/constants/constants";
import { ECompanyStatus } from "src/modules/companies/common/enums";
import { Company } from "src/modules/companies/entities";
import { CORPORATE_SUPER_ADMIN_ROLES } from "src/common/constants";
import { IMessageOutput } from "src/common/outputs";
import { findOneOrFailTyped, findOneTyped, generateCode, isInRoles } from "src/common/utils";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import {
  UsersPasswordService,
  UsersQueryOptionsService,
  UsersRegistrationStepsService,
} from "src/modules/users/services";
import {
  TChangeRegisteredPassword,
  TGetCurrentUser,
  TIsUserNotDeletedAndNotDeactivated,
  TІsUserNotDeletedAndNotDeactivatedCompany,
} from "src/modules/users/common/types";
import { AddPhoneNumberDto } from "src/modules/auth/common/dto";
import { RedisService } from "src/modules/redis/services";
import { LokiLogger } from "src/common/logger";

@Injectable()
export class UsersService {
  private readonly lokiLogger = new LokiLogger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly usersQueryOptionsService: UsersQueryOptionsService,
    private readonly usersRegistrationStepsService: UsersRegistrationStepsService,
    private readonly usersPasswordService: UsersPasswordService,
    private readonly emailsService: EmailsService,
    private readonly redisService: RedisService,
  ) {}

  public async getCurrentUser(user: ITokenUserData): Promise<TGetCurrentUser> {
    const queryOptions = this.usersQueryOptionsService.getCurrentUserOptions(user.id);
    const currentUser = await findOneOrFailTyped<TGetCurrentUser>(user.id, this.userRepository, queryOptions);

    return currentUser;
  }

  public async sendNewEmailVerificationCode(changeEmail: ChangeEmailDto): Promise<IMessageOutput> {
    const CACHE_KEY = `verification-code:email:${changeEmail.email}`;

    const user = await this.userRepository.exists({ where: { email: changeEmail.email } });

    if (user) {
      throw new ForbiddenException(EUsersErrorCodes.EMAIL_ALREADY_REGISTERED);
    }

    const emailConfirmationCode = generateCode();
    await this.redisService.set(CACHE_KEY, emailConfirmationCode);

    this.emailsService.sendConfirmationCode(changeEmail.email, emailConfirmationCode).catch((error: Error) => {
      this.lokiLogger.error(`Failed to send confirmation code for email: ${changeEmail.email}`, error.stack);
    });

    return { message: "Email verification code is sent." };
  }

  public async verifyNewEmailCode(email: string, verificationCode: string, userId: string): Promise<IMessageOutput> {
    await this.usersRegistrationStepsService.verifyEmailCode(email, verificationCode);
    await this.userRepository.update({ id: userId }, { email });

    return { message: "Email is verified" };
  }

  public async sendNewPhoneNumberVerificationCode(
    dto: AddPhoneNumberDto,
    user: ITokenUserData,
  ): Promise<IMessageOutput> {
    const userWithSamePhoneNumber = await this.userRepository.exists({ where: { phoneNumber: dto.phoneNumber } });

    if (userWithSamePhoneNumber) {
      throw new BadRequestException(EUsersErrorCodes.PHONE_NUMBER_ALREADY_EXISTS);
    }

    await this.usersRegistrationStepsService.sendPhoneNumberVerificationCode(dto.phoneNumber, user.id);

    return { message: "Phone verification code is sent" };
  }

  public async verifyNewPhoneNumberCode(dto: VerifyPhoneNumberDto, user: ITokenUserData): Promise<IMessageOutput> {
    await this.usersRegistrationStepsService.verifyPhoneNumber(dto.verificationCode, user.id);

    return { message: "Phone number is verified" };
  }

  public async changeRegisteredPassword(dto: ChangePasswordDto, currentUserData: ITokenUserData): Promise<void> {
    const queryOptions = this.usersQueryOptionsService.changeRegisteredPasswordOptions(currentUserData.id);
    const user = await findOneOrFailTyped<TChangeRegisteredPassword>(
      currentUserData.id,
      this.userRepository,
      queryOptions,
    );

    if (!user.password) {
      throw new BadRequestException(EUsersErrorCodes.PASSWORD_NOT_SET);
    }

    const isOldPasswordValid = await compare(dto.oldPassword, user.password);

    if (!isOldPasswordValid) {
      throw new BadRequestException(EUsersErrorCodes.INCORRECT_CURRENT_PASSWORD);
    }

    if (dto.oldPassword === dto.newPassword) {
      throw new BadRequestException(EUsersErrorCodes.NEW_PASSWORD_SAME_AS_CURRENT);
    }

    await this.usersPasswordService.setPassword(user.id, dto.newPassword);
  }

  public async isUserNotDeletedAndNotDeactivated(userRole: TIsUserNotDeletedAndNotDeactivated): Promise<void> {
    const queryOptions = this.usersQueryOptionsService.isUserNotDeletedAndNotDeactivatedOptions(
      userRole.userId,
      userRole.operatedByCompanyId,
    );

    if (isInRoles(CORPORATE_SUPER_ADMIN_ROLES, userRole.role.name)) {
      const company = await findOneTyped<TІsUserNotDeletedAndNotDeactivatedCompany>(
        this.companyRepository,
        queryOptions.superAdminCompany,
      );

      if (company && company.isInDeleteWaiting) {
        throw new ForbiddenException(EUsersErrorCodes.COMPANY_DELETED);
      }
    }

    if (userRole.operatedByCompanyName !== COMPANY_LFH_FULL_NAME) {
      if (!userRole.operatedByCompanyId) {
        throw new BadRequestException(EUsersErrorCodes.OPERATED_COMPANY_NOT_FOUND);
      }

      const company = await findOneOrFailTyped<TІsUserNotDeletedAndNotDeactivatedCompany>(
        userRole.operatedByCompanyId,
        this.companyRepository,
        queryOptions.operatedCompany,
        "operatedByCompanyId",
      );

      if (company.status === ECompanyStatus.DEACTIVATED) {
        throw new ForbiddenException(EUsersErrorCodes.COMPANY_DEACTIVATED);
      }

      if (company.isInDeleteWaiting) {
        throw new ForbiddenException(EUsersErrorCodes.COMPANY_DELETED_CONTACT_ADMIN);
      }
    }

    if (userRole.isInDeleteWaiting) {
      throw new ForbiddenException(EUsersErrorCodes.ACCOUNT_DELETED_USE_RESTORATION);
    }

    if (userRole.accountStatus === EAccountStatus.DEACTIVATED) {
      throw new ForbiddenException(EUsersErrorCodes.ACCOUNT_LOCKED);
    }
  }
}
