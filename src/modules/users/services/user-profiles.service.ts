import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, Repository } from "typeorm";
import { UserProfile } from "src/modules/users/entities";
import { UserProfileUpdatePolicyService, UsersQueryOptionsService } from "src/modules/users/services";
import { IUserProfileData } from "src/modules/users/common/interfaces";
import { EAccountStatus } from "src/modules/users/common/enums";
import { ActivationTrackingService } from "src/modules/activation-tracking/services";
import {
  CreateUserProfileDto,
  CreateUserProfileInformationDto,
  UpdateUserProfileDto,
} from "src/modules/users/common/dto";
import { UserRole } from "src/modules/users/entities";
import { Company } from "src/modules/companies/entities";
import { ECompanyStatus } from "src/modules/companies/common/enums";
import { UserAvatarsService } from "src/modules/user-avatars/services";
import { plainToInstance } from "class-transformer";
import { CreateUserProfileOutput, UserProfileOutput } from "src/modules/users/common/outputs";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { InterpreterBadgeService } from "src/modules/interpreters/badge/services";
import { CORPORATE_SUPER_ADMIN_ROLES } from "src/common/constants";
import { Address } from "src/modules/addresses/entities";
import { LokiLogger } from "src/common/logger";
import { findOneOrFailTyped, isInRoles } from "src/common/utils";
import {
  CreateUserProfileInformationQuery,
  TCreateUserProfileInformation,
  TFindUserProfileUserRole,
  TUpdateUserProfileInformation,
} from "src/modules/users/common/types";
import { AccessControlService } from "src/modules/access-control/services";
import { CreateAddressDto, UpdateAddressDto } from "src/modules/addresses/common/dto";

@Injectable()
export class UserProfilesService {
  private readonly lokiLogger = new LokiLogger(UserProfilesService.name);
  constructor(
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly userProfileUpdatePolicyService: UserProfileUpdatePolicyService,
    private readonly userAvatarsService: UserAvatarsService,
    private readonly activationTrackingService: ActivationTrackingService,
    private readonly interpreterBadgeService: InterpreterBadgeService,
    private readonly usersQueryOptionsService: UsersQueryOptionsService,
    private readonly accessControlService: AccessControlService,
  ) {}

  public async findUserProfile(user: ITokenUserData): Promise<UserProfileOutput> {
    const queryOptions = this.usersQueryOptionsService.findUserProfileUserRoleOptions(user.userRoleId);
    const userRole = await findOneOrFailTyped<TFindUserProfileUserRole>(
      user.userRoleId,
      this.userRoleRepository,
      queryOptions,
    );

    const userProfile: IUserProfileData = {
      ...userRole.user,
      userRoleId: userRole.id,
      country: userRole.country ?? null,
      userRoleCreationDate: userRole.creationDate,
      userRoleOperatedById: userRole.operatedByCompanyId,
      userRoleOperatedByName: userRole.operatedByCompanyName,
      userRoleIsActive: userRole.isActive,
      currentUserRole: userRole,
      roleName: userRole.role.name,
    };

    return plainToInstance(UserProfileOutput, userProfile);
  }

  public async createUserProfileInformation(
    dto: CreateUserProfileDto,
    user: ITokenUserData,
  ): Promise<CreateUserProfileOutput> {
    const isAdminOperation = this.accessControlService.checkAdminRoleForOperation(dto, user);
    const whereCondition: FindOptionsWhere<UserRole> = isAdminOperation
      ? { id: dto.userRoleId }
      : { id: user.userRoleId };

    const queryOptions = this.usersQueryOptionsService.createUserProfileInformationOptions(whereCondition);
    const userRole = await findOneOrFailTyped<TCreateUserProfileInformation>(
      user.userRoleId,
      this.userRoleRepository,
      queryOptions,
    );
    await this.accessControlService.authorizeUserRoleForOperation(user, userRole);

    if (userRole.address || userRole.profile) {
      throw new BadRequestException("Cannot create a user profile because it already exists");
    }

    await this.createUserProfileAndAddress(dto.profileInformation, dto.residentialAddress, userRole);

    if (userRole.user.administratedCompany && isInRoles(CORPORATE_SUPER_ADMIN_ROLES, user.role)) {
      await this.companyRepository.update(
        { id: userRole.user.administratedCompany.id },
        { status: ECompanyStatus.UNDER_REVIEW },
      );
    }

    const updatedUserRole = await findOneOrFailTyped<UserRole>(userRole.id, this.userRoleRepository, {
      where: { id: userRole.id },
      relations: CreateUserProfileInformationQuery.relations,
    });

    this.activationTrackingService.checkActivationStepsEnded(updatedUserRole).catch((error: Error) => {
      this.lokiLogger.error(`checkActivationStepsEnded error, userRoleId: ${updatedUserRole.id}`, error.stack);
    });

    return { ...updatedUserRole.user, userRoles: [updatedUserRole] };
  }

  public async createUserProfileAndAddress(
    profileInformationDto: CreateUserProfileInformationDto,
    residentialAddressDto: CreateAddressDto,
    userRole: TCreateUserProfileInformation,
  ): Promise<void> {
    const { user: currentUser } = userRole;

    const savedProfile = await this.constructAndCreateUserProfile(profileInformationDto, userRole);
    const savedAddress = await this.constructAndCreateUserAddress(residentialAddressDto, userRole);

    await this.userRoleRepository.update(userRole.id, {
      country: savedAddress.country,
      timezone: residentialAddressDto.timezone,
    });

    if (currentUser.isDefaultAvatar) {
      await this.userAvatarsService.setDefaultUserAvatar(currentUser.id, savedProfile.gender);
    }
  }

  private async constructAndCreateUserProfile(
    dto: CreateUserProfileInformationDto,
    userRole: TCreateUserProfileInformation,
  ): Promise<UserProfile> {
    if (!dto.contactEmail) {
      dto.contactEmail = userRole.user.email;
    }

    const newUserProfile = this.userProfileRepository.create({
      title: dto.title,
      firstName: dto.firstName,
      middleName: dto.middleName,
      lastName: dto.lastName,
      preferredName: dto.preferredName,
      dateOfBirth: dto.dateOfBirth,
      gender: dto.gender,
      contactEmail: dto.contactEmail,
      nativeLanguage: dto.nativeLanguage,
      isIdentifyAsAboriginalOrTorresStraitIslander: dto.isIdentifyAsAboriginalOrTorresStraitIslander,
      userRole,
    });
    const savedUserProfile = await this.userProfileRepository.save(newUserProfile);

    return savedUserProfile;
  }

  private async constructAndCreateUserAddress(
    dto: CreateAddressDto,
    userRole: TCreateUserProfileInformation,
  ): Promise<Address> {
    const newAddress = this.addressRepository.create({
      latitude: dto.latitude,
      longitude: dto.longitude,
      country: dto.country,
      state: dto.state,
      suburb: dto.suburb,
      streetName: dto.streetName,
      streetNumber: dto.streetNumber,
      postcode: dto.postcode,
      building: dto.building,
      unit: dto.unit,
      timezone: dto.timezone,
      userRole,
    });
    const savedAddress = await this.addressRepository.save(newAddress);

    return savedAddress;
  }

  public async updateUserProfileInformation(dto: UpdateUserProfileDto, user: ITokenUserData): Promise<void> {
    const isAdminOperation = this.accessControlService.checkAdminRoleForOperation(dto, user);
    const whereCondition: FindOptionsWhere<UserRole> = isAdminOperation
      ? { id: dto.userRoleId }
      : { id: user.userRoleId };

    const queryOptions = this.usersQueryOptionsService.updateUserProfileInformationOptions(whereCondition);
    const userRole = await findOneOrFailTyped<TUpdateUserProfileInformation>(
      user.userRoleId,
      this.userRoleRepository,
      queryOptions,
    );

    await this.userProfileUpdatePolicyService.validateUpdateUserProfileInformation(dto, user, userRole);

    await this.updateUserProfileInformationData(dto, userRole);

    if (userRole.interpreterProfile && userRole.interpreterProfile.interpreterBadgePdf) {
      this.interpreterBadgeService.createOrUpdateInterpreterBadgePdf(userRole.id).catch((error: Error) => {
        this.lokiLogger.error(`Failed to update interpreter badge pdf for userRoleId: ${userRole.id}`, error.stack);
      });
    }

    this.activationTrackingService.checkActivationStepsEnded(userRole).catch((error: Error) => {
      this.lokiLogger.error(`checkActivationStepsEnded error, userRoleId: ${userRole.id}`, error.stack);
    });
  }

  private async updateUserProfileInformationData(
    dto: UpdateUserProfileDto,
    userRole: TUpdateUserProfileInformation,
  ): Promise<void> {
    if (dto.residentialAddress) {
      await this.updateAddressAndLocation(userRole, dto.residentialAddress);
    }

    if (dto.profileInformation) {
      await this.userProfileRepository.update(userRole.profile.id, dto.profileInformation);

      if (dto.profileInformation.gender && userRole.user.isDefaultAvatar) {
        await this.userAvatarsService.setDefaultUserAvatar(userRole.userId, dto.profileInformation.gender);
      }
    }
  }

  private async updateAddressAndLocation(
    userRole: TUpdateUserProfileInformation,
    addressData: UpdateAddressDto,
  ): Promise<void> {
    if (userRole.address) {
      await this.addressRepository.update(userRole.address.id, addressData);
    }

    const userRolePayload: Partial<UserRole> = {
      timezone: addressData.timezone,
    };

    const isActiveAccount =
      userRole.accountStatus === EAccountStatus.ACTIVE || userRole.accountStatus === EAccountStatus.DEACTIVATED;

    if (addressData.country && !isActiveAccount) {
      userRolePayload.country = addressData.country;
    }

    await this.userRoleRepository.update(userRole.id, userRolePayload);
  }
}
