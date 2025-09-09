import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  ACCOUNT_STATUSES_ALLOWED_TO_IMMEDIATELY_DELETING,
  NUMBER_OF_MILLISECONDS_IN_MINUTE,
  NUMBER_OF_SECONDS_IN_DAY,
} from "src/common/constants";
import { UserRole } from "src/modules/users/entities";
import { User } from "src/modules/users/entities";
import {
  REGISTRATION_TOKEN_QUERY_PARAM,
  ROLE_QUERY_PARAM,
  USER_ID_QUERY_PARAM,
} from "src/modules/auth/common/constants/constants";
import { IGenerateRegistrationLink } from "src/modules/auth/common/interfaces";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EmailsService } from "src/modules/emails/services";
import { UsersRegistrationService } from "src/modules/users/services";
import { ResendRegistrationLinkDto, SendRegistrationLinkDto } from "src/modules/auth/common/dto";
import { RegistrationLinkOutput } from "src/modules/auth/common/outputs";
import { HelperService } from "src/modules/helper/services";
import { AuthQueryOptionsService, StagingService } from "src/modules/auth/services";
import { findOneOrFailTyped } from "src/common/utils";
import { TokensService } from "src/modules/tokens/services";
import {
  TResendRegistrationLink,
  TResendRegistrationLinkUserRole,
  TValidateInvitationLinkTimeLimit,
} from "src/modules/auth/common/types";
import { CreateUserProfileInformationDto } from "src/modules/users/common/dto";
import { CreateAddressDto } from "src/modules/addresses/common/dto";
import { EUserRoleName } from "src/modules/users/common/enums";
import { TProcessUserRegistrationLinkUserRole } from "src/modules/users/common/types";
import { LokiLogger } from "src/common/logger";
import { RemovalService } from "src/modules/removal/services";

@Injectable()
export class AuthRegistrationLinkService {
  private readonly lokiLogger = new LokiLogger(AuthRegistrationLinkService.name);
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly authQueryOptionsService: AuthQueryOptionsService,
    private readonly usersRegistrationService: UsersRegistrationService,
    private readonly configService: ConfigService,
    private readonly emailsService: EmailsService,
    private readonly tokensService: TokensService,
    private readonly helperService: HelperService,
    private readonly stagingService: StagingService,
    private readonly removalService: RemovalService,
  ) {}

  public async sendRegistrationLink(dto: SendRegistrationLinkDto): Promise<RegistrationLinkOutput> {
    await this.stagingService.checkEmailAccess(dto.email);

    const queryOptions = this.authQueryOptionsService.sendRegistrationLinkOptions(dto.email, dto.role);
    const existingRegistrationLink = await this.userRoleRepository.exists(queryOptions);

    if (existingRegistrationLink) {
      throw new BadRequestException(`Registration link already sent.`);
    }

    const { userRole, isUserExists } = await this.usersRegistrationService.registerUserForInvitationWithProfile(
      dto,
      dto.profileInformation,
      dto.address,
    );

    const { registrationLink, linkDurationString } = await this.generateRegistrationLink(
      userRole.userId,
      dto.email,
      dto.role,
      isUserExists,
    );
    this.emailsService
      .sendUserRegistrationLink(dto.email, registrationLink, linkDurationString, dto.role)
      .catch((error: Error) => {
        this.lokiLogger.error(`Failed to send registrationLink email for: ${dto.email}`, error.stack);
      });

    return {
      id: userRole.id,
      linkCreationTime: new Date(),
    };
  }

  public async resendRegistrationLink(dto: ResendRegistrationLinkDto): Promise<RegistrationLinkOutput> {
    const queryOptions = this.authQueryOptionsService.resendRegistrationLinkOptions(dto.email);
    const existingUser = await findOneOrFailTyped<TResendRegistrationLink>(
      dto.email,
      this.userRepository,
      queryOptions,
      "email",
    );

    const existingUserRole = await this.helperService.getUserRoleByName<TResendRegistrationLinkUserRole>(
      existingUser,
      dto.role,
    );

    if (existingUser.isRegistrationFinished && existingUserRole.isRegistrationFinished) {
      throw new BadRequestException("User already finished registration for this role.");
    }

    await this.validateInvitationLinkTimeLimit(existingUserRole);

    const userRole = !existingUser.isRegistrationFinished
      ? await this.recreateUserForRegistrationLink(dto, existingUser.id, existingUserRole)
      : existingUserRole;

    const { registrationLink, linkDurationString } = await this.generateRegistrationLink(
      userRole.userId,
      dto.email,
      dto.role,
      userRole.isRegistrationFinished,
    );
    this.emailsService
      .sendUserRegistrationLink(dto.email, registrationLink, linkDurationString, dto.role)
      .catch((error: Error) => {
        this.lokiLogger.error(`Failed to send registrationLink email for: ${dto.email}`, error.stack);
      });

    return {
      id: userRole.id,
      linkCreationTime: new Date(),
    };
  }

  public async deleteRegistrationLinkById(id: string): Promise<void> {
    const userRole = await this.userRoleRepository.findOne({
      where: { id },
      relations: { user: { userRoles: true }, role: true },
    });

    if (!userRole) {
      throw new NotFoundException("User role with this id not found!");
    }

    if (!ACCOUNT_STATUSES_ALLOWED_TO_IMMEDIATELY_DELETING.includes(userRole.accountStatus)) {
      throw new BadRequestException("User role with such account status cannot be deleted immediately!");
    }

    if (userRole.user.userRoles.length > 1) {
      await this.removalService.removeUserRole(userRole.id);
    } else {
      await this.removalService.removeUser(userRole.userId);
    }
  }

  public async generateRegistrationLink(
    userId: string,
    email: string,
    role: EUserRoleName,
    isExistingUser: boolean,
  ): Promise<IGenerateRegistrationLink> {
    const invitationToken = await this.tokensService.createRegistrationToken({
      email,
      userId,
      userRole: role,
      isInvitation: true,
    });

    const linkDurationSeconds = this.configService.getOrThrow<number>("jwt.invitation.expirationTimeSeconds");
    const linkDurationString = `${linkDurationSeconds / NUMBER_OF_SECONDS_IN_DAY} days`;

    const baseUrlConfigKey = isExistingUser
      ? "frontend.registrationStepAgreementsLink"
      : "frontend.registrationStepPasswordLink";
    const baseUrl = this.configService.getOrThrow<string>(baseUrlConfigKey);

    const queryParams = new URLSearchParams({
      [REGISTRATION_TOKEN_QUERY_PARAM]: invitationToken,
      [USER_ID_QUERY_PARAM]: userId,
      [ROLE_QUERY_PARAM]: role,
    });

    const registrationLink = `${baseUrl}?${queryParams.toString()}`;

    return { registrationLink, linkDurationString };
  }

  public async validateInvitationLinkTimeLimit(userRole: TValidateInvitationLinkTimeLimit): Promise<void> {
    if (!userRole.invitationLinkCreationDate) {
      return;
    }

    const MIN_TIME_LIMIT_MINUTES = 5;
    const minTimeLimit = MIN_TIME_LIMIT_MINUTES * NUMBER_OF_MILLISECONDS_IN_MINUTE;

    const now = new Date();
    const timeSinceLastInvite = now.getTime() - userRole.invitationLinkCreationDate.getTime();

    if (timeSinceLastInvite < minTimeLimit) {
      throw new BadRequestException(`Invitation link was sent less than ${MIN_TIME_LIMIT_MINUTES} minutes ago!`);
    }
  }

  private async recreateUserForRegistrationLink(
    dto: ResendRegistrationLinkDto,
    existingUserId: string,
    existingUserRole: TResendRegistrationLinkUserRole,
  ): Promise<TProcessUserRegistrationLinkUserRole> {
    await this.removalService.removeUser(existingUserId);

    const { address, profile } = existingUserRole;
    const { userRole } = await this.usersRegistrationService.registerUserForInvitationWithProfile(
      dto,
      profile as CreateUserProfileInformationDto,
      address as CreateAddressDto,
    );

    return userRole;
  }
}
