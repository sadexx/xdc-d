import { Injectable } from "@nestjs/common";
import { FindManyOptions, FindOneOptions } from "typeorm";
import { User, UserRole } from "src/modules/users/entities";
import {
  FinishRegistrationQuery,
  GetRegistrationStepsQuery,
  HandleThirdPartyAuthQuery,
  InitializeOrContinueUserRegistrationUserRoleQuery,
  RefreshTokensQuery,
  ResendRegistrationLinkQuery,
  SelectRoleQuery,
  StartSuperAdminRegistrationQuery,
  VerifyRegistrationLinkQuery,
  VerifyUserAuthorizationQuery,
} from "src/modules/auth/common/types";
import { EUserRoleName } from "src/modules/users/common/enums";

@Injectable()
export class AuthQueryOptionsService {
  /**
   ** AuthRegistrationService
   */

  public getRegistrationStepsOptions(email: string): FindOneOptions<User> {
    return {
      select: GetRegistrationStepsQuery.select,
      where: { email },
      relations: GetRegistrationStepsQuery.relations,
    };
  }

  public startSuperAdminRegistrationOptions(email: string): FindOneOptions<User> {
    return {
      select: StartSuperAdminRegistrationQuery.select,
      where: { email },
    };
  }

  public initializeOrContinueUserRegistrationOptions(email: string, roleName: EUserRoleName): FindOneOptions<UserRole> {
    return {
      select: InitializeOrContinueUserRegistrationUserRoleQuery.select,
      where: { user: { email }, role: { name: roleName } },
      relations: InitializeOrContinueUserRegistrationUserRoleQuery.relations,
    };
  }

  public finishRegistrationOptions(email: string): FindOneOptions<User> {
    return {
      select: FinishRegistrationQuery.select,
      where: { email },
      relations: FinishRegistrationQuery.relations,
    };
  }

  public verifyRegistrationLinkOptions(email: string, roleName: EUserRoleName): FindOneOptions<UserRole> {
    return {
      select: VerifyRegistrationLinkQuery.select,
      where: { user: { email }, role: { name: roleName } },
    };
  }

  /**
   ** AuthService
   */

  public verifyUserAuthorizationOptions(identification: string): FindOneOptions<User> {
    return {
      select: VerifyUserAuthorizationQuery.select,
      where: [{ email: identification }, { phoneNumber: identification }],
      relations: VerifyUserAuthorizationQuery.relations,
    };
  }

  public refreshTokensOptions(userId: string, roleName: EUserRoleName): FindOneOptions<UserRole> {
    return {
      select: RefreshTokensQuery.select,
      where: { user: { id: userId }, role: { name: roleName } },
      relations: RefreshTokensQuery.relations,
    };
  }

  public selectRoleOptions(email: string, roleName: EUserRoleName): FindOneOptions<UserRole> {
    return {
      select: SelectRoleQuery.select,
      where: { user: { email }, role: { name: roleName } },
      relations: SelectRoleQuery.relations,
    };
  }

  public changeRoleOptions(userId: string, roleName: EUserRoleName): FindOneOptions<UserRole> {
    return {
      select: SelectRoleQuery.select,
      where: { user: { id: userId }, role: { name: roleName } },
      relations: SelectRoleQuery.relations,
    };
  }

  /**
   ** RegistrationLinkService
   */

  public sendRegistrationLinkOptions(email: string, roleName: EUserRoleName): FindManyOptions<UserRole> {
    return {
      where: { user: { email }, role: { name: roleName }, isRegistrationFinished: false },
    };
  }

  public resendRegistrationLinkOptions(email: string): FindOneOptions<User> {
    return {
      select: ResendRegistrationLinkQuery.select,
      where: { email },
      relations: ResendRegistrationLinkQuery.relations,
    };
  }

  /**
   ** AuthThirdPartyService
   */

  public handleThirdPartyAuthOptions(email: string): FindOneOptions<User> {
    return {
      select: HandleThirdPartyAuthQuery.select,
      where: { email },
      relations: HandleThirdPartyAuthQuery.relations,
    };
  }
}
