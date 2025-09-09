import { FindOptionsRelations, FindOptionsSelect } from "typeorm";
import { UserRole } from "src/modules/users/entities";
import { QueryResultType } from "src/common/types";

export const CreateContractUserRoleQuery = {
  select: {
    id: true,
    isActive: true,
    profile: { id: true, title: true, firstName: true, middleName: true, lastName: true, contactEmail: true },
    address: { country: true },
  } as const satisfies FindOptionsSelect<UserRole>,
  relations: { profile: true, address: true } as const satisfies FindOptionsRelations<UserRole>,
};
export type TCreateContractUserRole = QueryResultType<UserRole, typeof CreateContractUserRoleQuery.select>;

export const FillAndSendContractUserRoleQuery = {
  select: {
    id: true,
    profile: {
      title: true,
      firstName: true,
      middleName: true,
      lastName: true,
      dateOfBirth: true,
      gender: true,
      contactEmail: true,
    },
    address: { country: true },
  } as const satisfies FindOptionsSelect<UserRole>,
  relations: { profile: true, address: true } as const satisfies FindOptionsRelations<UserRole>,
};
export type TFillAndSendContractUserRole = QueryResultType<UserRole, typeof FillAndSendContractUserRoleQuery.select>;

export const ResendContractUserRoleQuery = {
  select: { id: true, profile: { contactEmail: true } } as const satisfies FindOptionsSelect<UserRole>,
  relations: { profile: true } as const satisfies FindOptionsRelations<UserRole>,
};
export type TResendContractUserRole = QueryResultType<UserRole, typeof ResendContractUserRoleQuery.select>;
