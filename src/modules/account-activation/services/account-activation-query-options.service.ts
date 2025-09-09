import { Injectable } from "@nestjs/common";
import { FindOneOptions } from "typeorm";
import { User, UserRole } from "src/modules/users/entities";
import { EUserRoleName } from "src/modules/users/common/enums";
import { ICustomFindOptionsRelations } from "src/modules/account-activation/common/interfaces";
import {
  ActivateByAdminQuery,
  CompanyActivationQuery,
  DeactivateQuery,
  FetchUserAndEvaluateRequiredAndActivationStepsQuery,
  GetCountryByUserIdAndRoleNameQuery,
} from "src/modules/account-activation/common/types";
import { Company } from "src/modules/companies/entities";

@Injectable()
export class AccountActivationQueryOptionsService {
  /**
   ** AccountActivationService
   */

  public fetchUserAndEvaluateRequiredAndActivationSteps(
    userId: string,
    roleName: EUserRoleName,
    relations: ICustomFindOptionsRelations,
  ): FindOneOptions<User> {
    return {
      select: FetchUserAndEvaluateRequiredAndActivationStepsQuery.select,
      where: { userRoles: { userId, role: { name: roleName }, address: true, profile: true } },
      relations: { ...relations },
    };
  }

  public activateByAdminOptions(userRoleId: string): FindOneOptions<UserRole> {
    return {
      select: ActivateByAdminQuery.select,
      where: { id: userRoleId },
      relations: ActivateByAdminQuery.relations,
    };
  }

  public deactivateOptions(userRoleId: string): FindOneOptions<UserRole> {
    return {
      select: DeactivateQuery.select,
      where: { id: userRoleId },
      relations: DeactivateQuery.relations,
    };
  }

  /**
   ** CompanyActivationService
   */

  public companyActivationOptions(companyId: string): FindOneOptions<Company> {
    return {
      select: CompanyActivationQuery.select,
      where: { id: companyId },
      relations: CompanyActivationQuery.relations,
    };
  }

  /**
   ** StepInfoService
   */

  public getCountryByUserIdAndRoleNameOptions(userId: string, roleName: EUserRoleName): FindOneOptions<UserRole> {
    return {
      select: GetCountryByUserIdAndRoleNameQuery.select,
      where: { userId, role: { name: roleName } },
      relations: GetCountryByUserIdAndRoleNameQuery.relations,
    };
  }
}
