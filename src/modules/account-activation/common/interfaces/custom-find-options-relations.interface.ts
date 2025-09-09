import { User } from "src/modules/users/entities";
import { FindOptionsRelations } from "typeorm";
import { IUserRelations } from "src/modules/auth/common/interfaces";

export interface ICustomFindOptionsRelations extends FindOptionsRelations<User> {
  userRoles?: IUserRelations;
}
