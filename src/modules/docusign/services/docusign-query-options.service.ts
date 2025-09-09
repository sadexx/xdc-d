import { FindOneOptions } from "typeorm";
import {
  CreateContractUserRoleQuery,
  FillAndSendContractUserRoleQuery,
  ResendContractUserRoleQuery,
} from "src/modules/docusign/common/types";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { UserRole } from "src/modules/users/entities";
import { Injectable } from "@nestjs/common";

@Injectable()
export class DocusignQueryOptionsService {
  public getCreateContractUserRoleOptions(user: ITokenUserData): FindOneOptions<UserRole> {
    return {
      select: CreateContractUserRoleQuery.select,
      where: { id: user.userRoleId },
      relations: CreateContractUserRoleQuery.relations,
    };
  }

  public getFillAndSendContractUserRoleQueryOptions(user: ITokenUserData): FindOneOptions<UserRole> {
    return {
      select: FillAndSendContractUserRoleQuery.select,
      where: { id: user.userRoleId },
      relations: FillAndSendContractUserRoleQuery.relations,
    };
  }

  public getResendContractUserRoleQueryOptions(userRole: UserRole): FindOneOptions<UserRole> {
    return {
      select: ResendContractUserRoleQuery.select,
      where: { id: userRole.id },
      relations: ResendContractUserRoleQuery.relations,
    };
  }
}
