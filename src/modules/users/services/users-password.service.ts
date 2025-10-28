import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { hash } from "bcrypt";
import { Repository } from "typeorm";
import { NUMBER_OF_MINUTES_IN_HOUR } from "src/common/constants";
import { EmailsService } from "src/modules/emails/services";
import { User } from "src/modules/users/entities";
import { isEmail, isPhoneNumber } from "class-validator";
import { findOneOrFailTyped } from "src/common/utils";
import { UsersQueryOptionsService, UsersRegistrationStepsService } from "src/modules/users/services";
import { StartPasswordResetDto, VerifyPasswordResetCodeDto } from "src/modules/users/common/dto";
import { ICurrentClientData } from "src/modules/sessions/common/interfaces";
import { TSendRequestToChangePassword, TVerifyPasswordResetCode } from "src/modules/users/common/types";
import { TokensService } from "src/modules/tokens/services";
import { EUsersErrorCodes } from "src/modules/users/common/enums";

@Injectable()
export class UsersPasswordService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly usersQueryOptionsService: UsersQueryOptionsService,
    private readonly usersRegistrationStepsService: UsersRegistrationStepsService,
    private readonly configService: ConfigService,
    private readonly emailsService: EmailsService,
    private readonly tokensService: TokensService,
  ) {}

  public async setPassword(id: string, newPassword: string): Promise<void> {
    const hashedPassword = await hash(newPassword, this.configService.getOrThrow<number>("hashing.bcryptSaltRounds"));
    await this.userRepository.update(id, { password: hashedPassword });
  }

  public async sendRequestToChangePassword(
    dto: StartPasswordResetDto,
    currentClient: ICurrentClientData,
  ): Promise<void> {
    const queryOptions = this.usersQueryOptionsService.sendRequestToChangePasswordOptions(dto.identification);
    const user = await findOneOrFailTyped<TSendRequestToChangePassword>(
      dto.identification,
      this.userRepository,
      queryOptions,
      "identification",
    );

    if (!user.password) {
      throw new BadRequestException(EUsersErrorCodes.PASSWORD_NOT_FOUND_TRY_THIRD_PARTY);
    }

    if (isPhoneNumber(dto.identification)) {
      await this.processPhoneNumberPasswordReset(user);
    }

    if (isEmail(dto.identification)) {
      await this.processEmailPasswordReset(dto, currentClient, user);
    }
  }

  private async processPhoneNumberPasswordReset(user: TSendRequestToChangePassword): Promise<void> {
    if (!user.phoneNumber) {
      throw new NotFoundException(EUsersErrorCodes.USER_NO_PHONE_NUMBER);
    }

    await this.usersRegistrationStepsService.sendPhoneNumberVerificationCode(user.phoneNumber, user.id);
  }

  private async processEmailPasswordReset(
    dto: StartPasswordResetDto,
    currentClient: ICurrentClientData,
    user: TSendRequestToChangePassword,
  ): Promise<void> {
    const resetPasswordToken = await this.tokensService.createRestPasswordToken({
      identification: dto.identification,
      email: user.email,
      userId: user.id,
      clientIPAddress: currentClient.IPAddress,
      clientUserAgent: currentClient.userAgent,
    });
    const redirectionLink =
      this.configService.getOrThrow<string>("frontend.resetPasswordRedirectionLink") + `?token=${resetPasswordToken}`;
    const linkDuration = this.configService.getOrThrow<number>("jwt.resetPassword.expirationTimeSeconds");
    const linkDurationString = linkDuration / NUMBER_OF_MINUTES_IN_HOUR + " minutes";
    await this.emailsService.sendPasswordResetLink(user.email, redirectionLink, linkDurationString);
  }

  public async verifyPasswordResetPhoneCode(
    dto: VerifyPasswordResetCodeDto,
    currentClient: ICurrentClientData,
  ): Promise<string> {
    await this.usersRegistrationStepsService.verifyPhoneCode(dto.code, dto.phone);

    const queryOptions = this.usersQueryOptionsService.sendRequestToChangePasswordOptions(dto.phone);
    const user = await findOneOrFailTyped<TVerifyPasswordResetCode>(
      dto.phone,
      this.userRepository,
      queryOptions,
      "phoneNumber",
    );

    const resetPasswordToken = await this.tokensService.createRestPasswordToken({
      identification: dto.phone,
      email: user.email,
      userId: user.id,
      clientIPAddress: currentClient.IPAddress,
      clientUserAgent: currentClient.userAgent,
    });
    const redirectionLink =
      this.configService.getOrThrow<string>("frontend.resetPasswordRedirectionLink") + `?token=${resetPasswordToken}`;

    return redirectionLink;
  }
}
