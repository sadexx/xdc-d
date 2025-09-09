import { FindOneOptions, FindOptionsWhere } from "typeorm";
import { UserInInternalNaatiDatabaseQuery, VerificationNaatiCpnNumberQuery } from "src/modules/naati/common/types";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { UserRole } from "src/modules/users/entities";
import { Injectable } from "@nestjs/common";

@Injectable()
export class NaatiQueryOptionsService {
  public getUserInInternalNaatiDatabaseOptions(user: ITokenUserData): FindOneOptions<UserRole> {
    return {
      select: UserInInternalNaatiDatabaseQuery.select,
      where: { id: user.userRoleId },
      relations: UserInInternalNaatiDatabaseQuery.relations,
    };
  }

  public getVerificationNaatiCpnNumberOptions(whereConditions: FindOptionsWhere<UserRole>): FindOneOptions<UserRole> {
    return {
      select: VerificationNaatiCpnNumberQuery.select,
      where: whereConditions,
      relations: VerificationNaatiCpnNumberQuery.relations,
    };
  }
}
