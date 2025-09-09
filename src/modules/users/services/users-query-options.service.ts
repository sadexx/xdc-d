import { Injectable } from "@nestjs/common";
import { FindOneOptions, FindOptionsWhere } from "typeorm";
import { Role, User, UserRole } from "src/modules/users/entities";
import {
  AddNewUserRoleQuery,
  AgreeToConditionsQuery,
  ChangeRegisteredPasswordQuery,
  ConstructAndCreateUserRoleQuery,
  CreatePasswordQuery,
  CreateUserProfileInformationQuery,
  FindUserProfileUserRoleQuery,
  GetCurrentUserQuery,
  ProcessUserRegistrationLinkQuery,
  ProcessUserRegistrationLinkUserRoleQuery,
  SendRequestToChangePasswordQuery,
  StartRegistrationQuery,
  UpdateUserProfileInformationQuery,
  ValidatePhoneNumberAvailabilityQuery,
  VerifyEmailQuery,
  VerifyPasswordResetCodeQuery,
  ІsUserNotDeletedAndNotDeactivatedCompanyQuery,
} from "src/modules/users/common/types";
import { EUserRoleName } from "src/modules/users/common/enums";
import { Company } from "src/modules/companies/entities";

@Injectable()
export class UsersQueryOptionsService {
  /**
   ** UserProfilesService
   */

  public findUserProfileUserRoleOptions(userRoleId: string): FindOneOptions<UserRole> {
    return {
      select: FindUserProfileUserRoleQuery.select,
      where: { id: userRoleId },
      relations: FindUserProfileUserRoleQuery.relations,
    };
  }

  public createUserProfileInformationOptions(whereCondition: FindOptionsWhere<UserRole>): FindOneOptions<UserRole> {
    return {
      select: CreateUserProfileInformationQuery.select,
      where: whereCondition,
      relations: CreateUserProfileInformationQuery.relations,
    };
  }

  public updateUserProfileInformationOptions(whereCondition: FindOptionsWhere<UserRole>): FindOneOptions<UserRole> {
    return {
      select: UpdateUserProfileInformationQuery.select,
      where: whereCondition,
      relations: UpdateUserProfileInformationQuery.relations,
    };
  }

  /**
   ** UsersPasswordService
   */

  public sendRequestToChangePasswordOptions(identification: string): FindOneOptions<User> {
    return {
      select: SendRequestToChangePasswordQuery.select,
      where: [{ email: identification }, { phoneNumber: identification }],
    };
  }

  public verifyPasswordResetPhoneCodeOptions(phoneNumber: string): FindOneOptions<User> {
    return {
      select: VerifyPasswordResetCodeQuery.select,
      where: { phoneNumber },
    };
  }

  /**
   ** UsersRegistrationService
   */

  public constructAndCreateUserRoleOptions(roleName: EUserRoleName): FindOneOptions<Role> {
    return {
      select: ConstructAndCreateUserRoleQuery.select,
      where: { name: roleName },
    };
  }

  public addNewUserRoleOptions(id: string): FindOneOptions<User> {
    return {
      select: AddNewUserRoleQuery.select,
      where: { id },
      relations: AddNewUserRoleQuery.relations,
    };
  }

  public processUserRegistrationLinkOptions(
    email: string,
    roleName: EUserRoleName,
  ): {
    user: FindOneOptions<User>;
    userRole: FindOneOptions<UserRole>;
  } {
    return {
      user: {
        select: ProcessUserRegistrationLinkQuery.select,
        where: { email },
        relations: ProcessUserRegistrationLinkQuery.relations,
      },
      userRole: {
        select: ProcessUserRegistrationLinkUserRoleQuery.select,
        where: { user: { email }, role: { name: roleName } },
        relations: ProcessUserRegistrationLinkUserRoleQuery.relations,
      },
    };
  }

  /**
   ** UsersRegistrationStepsService
   */

  public startRegistrationOptions(email: string): FindOneOptions<User> {
    return {
      select: StartRegistrationQuery.select,
      where: { email },
      relations: StartRegistrationQuery.relations,
    };
  }

  public verifyEmailOptions(email: string): FindOneOptions<User> {
    return {
      select: VerifyEmailQuery.select,
      where: { email },
      relations: VerifyEmailQuery.relations,
    };
  }

  public createPasswordOptions(email: string): FindOneOptions<User> {
    return {
      select: CreatePasswordQuery.select,
      where: { email },
    };
  }

  public validatePhoneNumberAvailabilityOptions(phoneNumber: string): FindOneOptions<User> {
    return {
      select: ValidatePhoneNumberAvailabilityQuery.select,
      where: { phoneNumber },
    };
  }

  public agreeToConditionsOptions(email: string, roleName: EUserRoleName): FindOneOptions<UserRole> {
    return {
      select: AgreeToConditionsQuery.select,
      where: { user: { email }, role: { name: roleName } },
    };
  }

  /**
   ** UsersService
   */

  public getCurrentUserOptions(id: string): FindOneOptions<User> {
    return {
      select: GetCurrentUserQuery.select,
      where: { id },
      relations: GetCurrentUserQuery.relations,
    };
  }

  public changeRegisteredPasswordOptions(id: string): FindOneOptions<User> {
    return {
      select: ChangeRegisteredPasswordQuery.select,
      where: { id },
    };
  }

  public isUserNotDeletedAndNotDeactivatedOptions(
    id: string,
    operatedByCompanyId: string,
  ): { superAdminCompany: FindOneOptions<Company>; operatedCompany: FindOneOptions<Company> } {
    return {
      superAdminCompany: {
        select: ІsUserNotDeletedAndNotDeactivatedCompanyQuery.select,
        where: { superAdminId: id },
      },
      operatedCompany: {
        select: ІsUserNotDeletedAndNotDeactivatedCompanyQuery.select,
        where: { id: operatedByCompanyId },
      },
    };
  }
}
