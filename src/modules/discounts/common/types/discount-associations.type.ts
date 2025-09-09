import { FindOptionsSelect } from "typeorm";
import { QueryResultType } from "src/common/types";
import { DiscountAssociation } from "src/modules/discounts/entities";

/**
 ** Type
 */

export type TCreateOrUpdateDiscountAssociationAppointment = Pick<DiscountAssociation, "id">;

/**
 ** Query types
 */

export const CreateOrUpdateDiscountAssociationQuery = {
  select: {
    id: true,
  } as const satisfies FindOptionsSelect<DiscountAssociation>,
};
export type TCreateOrUpdateDiscountAssociation = QueryResultType<
  DiscountAssociation,
  typeof CreateOrUpdateDiscountAssociationQuery.select
>;
