import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, EntityManager, Repository } from "typeorm";
import { Role, User, UserRole } from "src/modules/users/entities";
import { UserAvatarsService } from "src/modules/user-avatars/services";
import { EAccountStatus, EUserRoleName } from "src/modules/users/common/enums";
import { findOneOrFailTyped, findOneTyped } from "src/common/utils";
import { UserProfilesService, UsersQueryOptionsService } from "src/modules/users/services";
import {
  TAddNewUserRole,
  TConstructAndCreateUserRole,
  TConstructAndCreateUserRoleUser,
  TProcessUserRegistrationLink,
  TProcessUserRegistrationLinkUserRole,
  TSetupUserForRegistrationLink,
} from "src/modules/users/common/types";
import { IProcessUserRegistrationLink } from "src/modules/users/common/interfaces";
import { CreateUserProfileInformationDto } from "src/modules/users/common/dto";
import { CreateAddressDto } from "src/modules/addresses/common/dto";

@Injectable()
export class UsersRegistrationService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly usersQueryOptionsService: UsersQueryOptionsService,
    private readonly userProfilesService: UserProfilesService,
    private readonly userAvatarsService: UserAvatarsService,
    private readonly dataSource: DataSource,
  ) {}

  public async registerUser(email: string, roleName: EUserRoleName, phoneNumber?: string): Promise<User> {
    const newUser = await this.dataSource.transaction(async (manager) => {
      const user = await this.constructAndCreateUser(manager, email, phoneNumber);
      await this.constructAndCreateUserRole(manager, user, roleName);

      return user;
    });

    await this.userAvatarsService.setDefaultUserAvatar(newUser.id);

    return newUser;
  }

  public async addNewUserRole(userId: string, roleName: EUserRoleName): Promise<UserRole> {
    const queryOptions = this.usersQueryOptionsService.addNewUserRoleOptions(userId);
    const user = await findOneOrFailTyped<TAddNewUserRole>(userId, this.userRepository, queryOptions);

    const userRole = user.userRoles.find((userRole) => userRole.role.name === roleName);

    if (userRole && userRole.isRegistrationFinished) {
      throw new BadRequestException("User already registered with this role");
    }

    return await this.constructAndCreateUserRole(this.dataSource.manager, user, roleName);
  }

  public async registerUserForInvitationWithProfile(
    dto: TSetupUserForRegistrationLink,
    profileInformationDto?: CreateUserProfileInformationDto,
    residentialAddressDto?: CreateAddressDto,
  ): Promise<IProcessUserRegistrationLink> {
    const { userRole, user, isUserExists } = await this.registerUserForInvitation(dto.email, dto.role, dto.phoneNumber);

    if (profileInformationDto && residentialAddressDto && !userRole.address && !userRole.profile) {
      await this.userProfilesService.createUserProfileAndAddress(
        profileInformationDto,
        residentialAddressDto,
        userRole,
      );
    }

    return { userRole, user, isUserExists };
  }

  private async constructAndCreateUser(manager: EntityManager, email: string, phoneNumber?: string): Promise<User> {
    const userRepository = manager.getRepository(User);

    const newUserDto = userRepository.create({
      email,
      isEmailVerified: true,
      phoneNumber,
    });
    const savedUser = await userRepository.save(newUserDto);

    return savedUser;
  }

  private async constructAndCreateUserRole(
    manager: EntityManager,
    user: TConstructAndCreateUserRoleUser,
    roleName: EUserRoleName,
  ): Promise<UserRole> {
    const queryOptions = this.usersQueryOptionsService.constructAndCreateUserRoleOptions(roleName);
    const role = await findOneOrFailTyped<TConstructAndCreateUserRole>(
      roleName,
      manager.getRepository(Role),
      queryOptions,
      "name",
    );

    return await this.createUserRole(manager, user, role);
  }

  private async createUserRole(
    manager: EntityManager,
    user: TConstructAndCreateUserRoleUser,
    role: TConstructAndCreateUserRole,
  ): Promise<UserRole> {
    const userRoleRepository = manager.getRepository(UserRole);

    const newUserRoleDto = userRoleRepository.create({ role, user });
    const savedUserRole = await userRoleRepository.save(newUserRoleDto);

    return savedUserRole;
  }

  public async registerUserForInvitation(
    email: string,
    role: EUserRoleName,
    phoneNumber?: string,
  ): Promise<IProcessUserRegistrationLink> {
    const queryOptions = this.usersQueryOptionsService.processUserRegistrationLinkOptions(email, role);
    let user = await findOneTyped<TProcessUserRegistrationLink>(this.userRepository, queryOptions.user);

    const isUserExists = Boolean(user);

    if (user) {
      if (phoneNumber && user.phoneNumber !== phoneNumber) {
        throw new BadRequestException("This phone number is already in use by another account.");
      }

      await this.addNewUserRole(user.id, role);
    } else {
      user = await this.registerUser(email, role, phoneNumber);
    }

    const userRole = await findOneOrFailTyped<TProcessUserRegistrationLinkUserRole>(
      email,
      this.userRoleRepository,
      queryOptions.userRole,
      "email",
    );

    await this.userRoleRepository.update(userRole.id, {
      invitationLinkCreationDate: new Date(),
      accountStatus: EAccountStatus.INVITATION_LINK,
    });
    await this.userRepository.update({ email: email }, { isEmailVerified: true });

    return { userRole, user, isUserExists };
  }
}
