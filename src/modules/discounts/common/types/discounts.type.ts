import { FindOptionsSelect, FindOptionsRelations } from "typeorm";
import { NonNullableProperties, QueryResultType } from "src/common/types";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { DiscountAssociation } from "src/modules/discounts/entities";

/**
 ** Type
 */

export type TApplyDiscountsForAppointmentValidated = NonNullableProperties<TApplyDiscountsForAppointment, "client">;

/**
 ** Query types
 */

export const FetchDiscountRateQuery = {
  select: {
    promoCampaignDiscount: true,
    membershipDiscount: true,
    promoCampaignDiscountMinutes: true,
    membershipFreeMinutes: true,
    promoCode: true,
    membershipType: true,
  } as const satisfies FindOptionsSelect<DiscountAssociation>,
};
export type TFetchDiscountRate = QueryResultType<DiscountAssociation, typeof FetchDiscountRateQuery.select>;

export const ApplyDiscountsForAppointmentQuery = {
  select: {
    id: true,
    scheduledStartTime: true,
    communicationType: true,
    schedulingType: true,
    topic: true,
    interpreterType: true,
    interpretingType: true,
    schedulingDurationMin: true,
    client: {
      id: true,
      operatedByCompanyId: true,
    },
  } as const satisfies FindOptionsSelect<Appointment>,
  relations: { client: true } as const satisfies FindOptionsRelations<Appointment>,
};
export type TApplyDiscountsForAppointment = QueryResultType<
  Appointment,
  typeof ApplyDiscountsForAppointmentQuery.select
>;
