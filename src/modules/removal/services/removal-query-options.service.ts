import { Injectable } from "@nestjs/common";
import { FindManyOptions, FindOneOptions, LessThanOrEqual } from "typeorm";
import { User, UserRole } from "src/modules/users/entities";
import {
  RemoveCompaniesQuery,
  RemoveUnfinishedRegistrationUserRolesQuery,
  RemoveUserQuery,
  RemoveUserRequestQuery,
  RemoveUserRoleQuery,
  RemoveUserRoleRequestQuery,
  RemoveUserRolesQuery,
  RemoveUsersQuery,
  ResolveEmailRecipientAdminQuery,
  ResolveEmailRecipientCompanyQuery,
  RestoreByRestorationKeyUserQuery,
  RestoreCompanyEntityQuery,
} from "src/modules/removal/common/types";
import { Company } from "src/modules/companies/entities";

@Injectable()
export class RemovalQueryOptionsService {
  /**
   ** RemovalRequestService
   */

  public removeUserRequestOptions(userId: string): FindOneOptions<User> {
    return {
      select: RemoveUserRequestQuery.select,
      where: { id: userId },
      relations: RemoveUserRequestQuery.relations,
    };
  }

  public removeUserRoleRequestOptions(userRoleId: string): FindOneOptions<UserRole> {
    return {
      select: RemoveUserRoleRequestQuery.select,
      where: { id: userRoleId },
      relations: RemoveUserRoleRequestQuery.relations,
    };
  }

  public resolveEmailRecipientOptions(
    userRoleId: string,
    operatedByCompanyId: string,
  ): {
    admin: FindOneOptions<UserRole>;
    company: FindOneOptions<Company>;
  } {
    return {
      admin: {
        select: ResolveEmailRecipientAdminQuery.select,
        where: { id: userRoleId },
        relations: ResolveEmailRecipientAdminQuery.relations,
      },
      company: {
        select: ResolveEmailRecipientCompanyQuery.select,
        where: { id: operatedByCompanyId },
      },
    };
  }

  /**
   ** RemovalRestorationService
   */

  public restoreByRestorationKeyOptions(restorationKey: string): {
    user: FindOneOptions<User>;
    userRole: FindOneOptions<UserRole>;
  } {
    return {
      user: {
        select: RestoreByRestorationKeyUserQuery.select,
        where: { restorationKey },
      },
      userRole: { select: RestoreByRestorationKeyUserQuery.select, where: { restorationKey } },
    };
  }

  public restoreCompanyEntityOptions(userId: string): FindOneOptions<Company> {
    return {
      select: RestoreCompanyEntityQuery.select,
      where: { superAdminId: userId },
    };
  }

  /**
   ** RemovalSchedulerService
   */

  public removeUsersOptions(): FindManyOptions<User> {
    return {
      select: RemoveUsersQuery.select,
      where: { isInDeleteWaiting: true, deletingDate: LessThanOrEqual(new Date()) },
      relations: RemoveUsersQuery.relations,
    };
  }

  public removeUserRolesOptions(): FindManyOptions<UserRole> {
    return {
      select: RemoveUserRolesQuery.select,
      where: { isInDeleteWaiting: true, deletingDate: LessThanOrEqual(new Date()) },
      relations: RemoveUserRolesQuery.relations,
    };
  }

  public removeUnfinishedRegistrationUserRolesOptions(registrationExpiryDate: Date): FindManyOptions<UserRole> {
    return {
      select: RemoveUnfinishedRegistrationUserRolesQuery.select,
      where: {
        isRegistrationFinished: false,
        creationDate: LessThanOrEqual(registrationExpiryDate),
      },
      relations: RemoveUnfinishedRegistrationUserRolesQuery.relations,
    };
  }

  public removeCompaniesOptions(): FindManyOptions<Company> {
    return {
      select: RemoveCompaniesQuery.select,
      where: { isInDeleteWaiting: true, deletingDate: LessThanOrEqual(new Date()) },
      relations: RemoveCompaniesQuery.relations,
    };
  }

  /**
   ** RemovalService
   */

  public removeUserOptions(userId: string): FindOneOptions<User> {
    return {
      select: RemoveUserQuery.select,
      where: { id: userId },
      relations: RemoveUserQuery.relations,
    };
  }

  public removeUserRoleOptions(userRoleId: string): FindOneOptions<UserRole> {
    return {
      select: RemoveUserRoleQuery.select,
      where: { id: userRoleId },
      relations: RemoveUserRoleQuery.relations,
    };
  }
}
