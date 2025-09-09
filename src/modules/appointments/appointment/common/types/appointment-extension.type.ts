import { FindOptionsRelations, FindOptionsSelect } from "typeorm";
import { QueryResultType } from "src/common/types";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { Rate } from "src/modules/rates/entities";

export const LiveAppointmentCacheQuery = {
  select: {
    id: true,
    platformId: true,
    clientId: true,
    interpreterId: true,
    interpreter: { timezone: true },
    client: { id: true, operatedByCompanyId: true },
    scheduledStartTime: true,
    schedulingDurationMin: true,
    topic: true,
    communicationType: true,
    schedulingType: true,
    interpreterType: true,
    interpretingType: true,
    businessStartTime: true,
    businessEndTime: true,
    internalEstimatedEndTime: true,
    acceptOvertimeRates: true,
    timezone: true,
  } as const satisfies FindOptionsSelect<Appointment>,
  relations: { interpreter: true, client: true } as const satisfies FindOptionsRelations<Appointment>,
};
export type TLiveAppointmentCache = QueryResultType<Appointment, typeof LiveAppointmentCacheQuery.select>;

export const RateForBusinessExtension = {
  select: {
    id: true,
    detailsTime: true,
    normalHoursStart: true,
    normalHoursEnd: true,
    qualifier: true,
  } as const satisfies FindOptionsSelect<Rate>,
};
export type TRateForBusinessExtension = QueryResultType<Rate, typeof RateForBusinessExtension.select>;
